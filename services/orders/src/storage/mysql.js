const mysql = require('mysql2/promise');

const COLUMNS = [
  'id',
  'product_id AS productId',
  'product_name AS productName',
  'quantity',
  'unit_price AS unitPrice',
  'total',
  'created_at AS createdAt',
].join(', ');

function createMysqlStorage(database) {
  let pool;

  function getPool() {
    if (!pool) {
      pool = mysql.createPool({
        ...database,
        decimalNumbers: true,
        timezone: 'Z',
        connectTimeout: 3000,
      });
    }
    return pool;
  }

  async function findById(id) {
    const [rows] = await getPool().execute(`SELECT ${COLUMNS} FROM orders WHERE id = ?`, [id]);
    return rows[0] ?? null;
  }

  return {
    async ping() {
      await getPool().query('SELECT 1');
    },

    async list() {
      const [rows] = await getPool().query(`SELECT ${COLUMNS} FROM orders ORDER BY id`);
      return rows;
    },

    findById,

    async create({ productId, productName, quantity, unitPrice, total }) {
      const [result] = await getPool().execute(
        'INSERT INTO orders (product_id, product_name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
        [productId, productName, quantity, unitPrice, total],
      );
      return findById(result.insertId);
    },
  };
}

module.exports = { createMysqlStorage };
