function createMemoryStorage() {
  const orders = [];
  let nextId = 1;

  return {
    async ping() {},

    async list() {
      return orders;
    },

    async findById(id) {
      return orders.find((order) => order.id === id) ?? null;
    },

    async create({ productId, productName, quantity, unitPrice, total }) {
      const order = {
        id: nextId++,
        productId,
        productName,
        quantity,
        unitPrice,
        total,
        createdAt: new Date().toISOString(),
      };
      orders.push(order);
      return order;
    },
  };
}

module.exports = { createMemoryStorage };
