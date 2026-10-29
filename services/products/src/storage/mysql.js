const mysql = require('mysql2/promise');

const COLUMNS = 'id, name, price';

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
    const [rows] = await getPool().execute(`SELECT ${COLUMNS} FROM products WHERE id = ?`, [id]);
    return rows[0] ?? null;
  }

  return {
    async ping() {
      await getPool().query('SELECT 1');
    },

    async list() {
      const [rows] = await getPool().query(`SELECT ${COLUMNS} FROM products ORDER BY id`);
      return rows;
    },

    findById,

    async create({ name, price }) {
      const [result] = await getPool().execute(
        'INSERT INTO products (name, price) VALUES (?, ?)',
        [name, price],
      );
      return findById(result.insertId);
    },
  };
}

module.exports = { createMysqlStorage };
