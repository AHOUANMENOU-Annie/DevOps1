const os = require('node:os');
const express = require('express');
const { createMemoryStorage } = require('./storage/memory');
const { createMysqlStorage } = require('./storage/mysql');

const SERVICE_NAME = 'orders';
const DEFAULT_PORT = 3002;
const DEFAULT_PRODUCTS_URL = 'http://localhost:3001';
const PRODUCTS_TIMEOUT_MS = 3000;
const DATABASE_VARIABLES = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

function readConfig(env) {
  return {
    service: SERVICE_NAME,
    port: Number(env.PORT) || DEFAULT_PORT,
    environment: env.APP_ENV || 'local',
    version: env.APP_VERSION || '1.0.0',
    storage: env.STORAGE || 'memory',
    productsUrl: (env.PRODUCTS_URL || DEFAULT_PRODUCTS_URL).replace(/\/+$/, ''),
  };
}

function readDatabaseConfig(env) {
  const missing = DATABASE_VARIABLES.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`STORAGE=mysql exige les variables ${missing.join(', ')}`);
  }
  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  };
}

function createStorage(config, env) {
  if (config.storage === 'memory') return createMemoryStorage();
  if (config.storage === 'mysql') return createMysqlStorage(readDatabaseConfig(env));
  throw new Error(`STORAGE invalide : ${config.storage} (valeurs acceptées : memory, mysql)`);
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

async function fetchProduct(productsUrl, productId) {
  const response = await fetch(`${productsUrl}/products/${productId}`, {
    signal: AbortSignal.timeout(PRODUCTS_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`products a répondu ${response.status}`);
  return response.json();
}

function createApp() {
  const config = readConfig(process.env);
  const orders = createStorage(config, process.env);
  const app = express();

  app.locals.config = config;
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({
      service: config.service,
      version: config.version,
      environment: config.environment,
      hostname: os.hostname(),
      node: process.version,
      storage: config.storage,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  app.get('/health', async (req, res) => {
    try {
      await orders.ping();
      res.json({ status: 'ok' });
    } catch (err) {
      console.error(`[${SERVICE_NAME}] base injoignable : ${err.message}`);
      res.status(503).json({ status: 'degraded' });
    }
  });

  app.post('/orders', async (req, res) => {
    const { productId, quantity } = req.body ?? {};
    if (!isPositiveInteger(quantity)) {
      return res.status(400).json({ error: 'le champ quantity doit être un entier positif' });
    }
    if (!isPositiveInteger(productId)) {
      return res.status(400).json({ error: 'le champ productId doit être un entier positif' });
    }

    let product;
    try {
      product = await fetchProduct(config.productsUrl, productId);
    } catch (err) {
      console.error(`[${SERVICE_NAME}] appel à ${config.productsUrl} en échec : ${err.cause?.code || err.message}`);
      return res.status(502).json({ error: 'service products indisponible' });
    }
    if (!product) {
      return res.status(404).json({ error: 'produit introuvable' });
    }

    const order = await orders.create({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      total: Math.round(product.price * quantity * 100) / 100,
    });
    res.status(201).json(order);
  });

  app.get('/orders', async (req, res) => {
    res.json(await orders.list());
  });

  app.get('/orders/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const order = id && (await orders.findById(id));
    if (!order) {
      return res.status(404).json({ error: 'commande introuvable' });
    }
    res.json(order);
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'route introuvable' });
  });

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'corps JSON invalide' });
    }
    console.error(`[${SERVICE_NAME}] ${err.message}`);
    res.status(500).json({ error: 'erreur interne' });
  });

  return app;
}

module.exports = { createApp };
