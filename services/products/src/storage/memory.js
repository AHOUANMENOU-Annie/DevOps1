const INITIAL_PRODUCTS = [
  { id: 1, name: 'Clavier mécanique', price: 49.9 },
  { id: 2, name: 'Souris sans fil', price: 19.99 },
  { id: 3, name: 'Écran 24 pouces', price: 129 },
];

function createMemoryStorage() {
  const products = INITIAL_PRODUCTS.map((product) => ({ ...product }));
  let nextId = products.length + 1;

  return {
    async ping() {},

    async list() {
      return products;
    },

    async findById(id) {
      return products.find((product) => product.id === id) ?? null;
    },

    async create({ name, price }) {
      const product = { id: nextId++, name, price };
      products.push(product);
      return product;
    },
  };
}

module.exports = { createMemoryStorage };
