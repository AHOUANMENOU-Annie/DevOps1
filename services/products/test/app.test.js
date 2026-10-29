const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../src/app');

let server;
let baseUrl;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { status: response.status, body: await response.json() };
}

function postProduct(body) {
  return request('/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

before(async () => {
  process.env.STORAGE = 'memory';
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

test('GET /health répond ok', async () => {
  const { status, body } = await request('/health');
  assert.equal(status, 200);
  assert.deepEqual(body, { status: 'ok' });
});

test('GET /products renvoie les trois produits initiaux', async () => {
  const { status, body } = await request('/products');
  assert.equal(status, 200);
  assert.equal(body.length, 3);
});

test('GET /products/999 renvoie 404', async () => {
  const { status, body } = await request('/products/999');
  assert.equal(status, 404);
  assert.deepEqual(body, { error: 'produit introuvable' });
});

test('POST /products crée un produit', async () => {
  const { status, body } = await postProduct({ name: 'Casque audio', price: 59.5 });
  assert.equal(status, 201);
  assert.equal(body.name, 'Casque audio');
  assert.equal(body.price, 59.5);
  assert.equal(typeof body.id, 'number');
});

test('POST /products refuse un nom vide ou un prix invalide', async () => {
  const invalidBodies = [
    { name: '', price: 10 },
    { name: 'Câble', price: -5 },
    { name: 'Câble', price: 'dix' },
    { price: 10 },
  ];
  for (const body of invalidBodies) {
    const { status } = await postProduct(body);
    assert.equal(status, 400, JSON.stringify(body));
  }
});
