const os = require('node:os');
const express = require('express');
const { createMemoryStorage } = require('./storage/memory');
const { createMysqlStorage } = require('./storage/mysql');

const SERVICE_NAME = 'products';
const DEFAULT_PORT = 3001;
const DATABASE_VARIABLES = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

function readConfig(env) {
  return {
    service: SERVICE_NAME,
    port: Number(env.PORT) || DEFAULT_PORT,
    environment: env.APP_ENV || 'local',
    version: env.APP_VERSION || '1.0.0',
    storage: env.STORAGE || 'memory',
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

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function createApp() {
  const config = readConfig(process.env);
  const products = createStorage(config, process.env);
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
      await products.ping();
      res.json({ status: 'ok' });
    } catch (err) {
      console.error(`[${SERVICE_NAME}] base injoignable : ${err.message}`);
      res.status(503).json({ status: 'degraded' });
    }
  });

  app.get('/products', async (req, res) => {
    res.json(await products.list());
  });

  app.get('/products/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const product = id && (await products.findById(id));
    if (!product) {
      return res.status(404).json({ error: 'produit introuvable' });
    }
    res.json(product);
  });

  app.post('/products', async (req, res) => {
    const { name, price } = req.body ?? {};
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'le champ name est obligatoire' });
    }
    if (!isPositiveNumber(price)) {
      return res.status(400).json({ error: 'le champ price doit être un nombre positif' });
    }
    res.status(201).json(await products.create({ name: name.trim(), price }));
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
