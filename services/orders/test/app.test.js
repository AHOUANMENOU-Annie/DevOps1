const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createApp } = require('../src/app');

const knownProduct = { id: 1, name: 'Clavier mécanique', price: 12.5 };

let fakeProducts;
let orders;

function handleFakeProducts(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET' && req.url === '/products/1') {
    res.end(JSON.stringify(knownProduct));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'produit introuvable' }));
}

async function start(listener) {
  const server = listener.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server;
}

function stop(server) {
  server.closeAllConnections();
  return new Promise((resolve) => server.close(resolve));
}

function urlOf(server) {
  return `http://127.0.0.1:${server.address().port}`;
}

async function findClosedPort() {
  const server = await start(http.createServer());
  const { port } = server.address();
  await stop(server);
  return port;
}

async function postOrder(server, body) {
  const response = await fetch(`${urlOf(server)}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  fakeProducts = await start(http.createServer(handleFakeProducts));
  process.env.STORAGE = 'memory';
  process.env.PRODUCTS_URL = urlOf(fakeProducts);
  orders = await start(createApp());
});

after(async () => {
  await stop(orders);
  await stop(fakeProducts);
});

test('POST /orders crée une commande à partir du produit', async () => {
  const { status, body } = await postOrder(orders, { productId: 1, quantity: 3 });
  assert.equal(status, 201);
  assert.equal(body.productId, 1);
  assert.equal(body.productName, knownProduct.name);
  assert.equal(body.quantity, 3);
  assert.equal(body.unitPrice, knownProduct.price);
  assert.equal(body.total, 37.5);
  assert.equal(typeof body.id, 'number');
  assert.ok(body.createdAt);
});

test('POST /orders renvoie 404 pour un produit inexistant', async () => {
  const { status, body } = await postOrder(orders, { productId: 42, quantity: 1 });
  assert.equal(status, 404);
  assert.deepEqual(body, { error: 'produit introuvable' });
});

test('POST /orders refuse une quantité invalide', async () => {
  for (const quantity of [0, -2, 1.5, '2', undefined]) {
    const { status } = await postOrder(orders, { productId: 1, quantity });
    assert.equal(status, 400, `quantity = ${quantity}`);
  }
});

test('POST /orders renvoie 502 quand products ne répond pas', async () => {
  process.env.PRODUCTS_URL = `http://127.0.0.1:${await findClosedPort()}`;
  const isolated = await start(createApp());
  try {
    const { status, body } = await postOrder(isolated, { productId: 1, quantity: 1 });
    assert.equal(status, 502);
    assert.deepEqual(body, { error: 'service products indisponible' });
  } finally {
    await stop(isolated);
  }
});
