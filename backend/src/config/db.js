import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool;

export function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: env.DB_CONNECTION_LIMIT,
      queueLimit: 0,
      decimalNumbers: true,
      timezone: '+00:00',
      dateStrings: true,
    });
  }
  return pool;
}

/**
 * Execute parameterized SQL query using pool
 */
export async function query(sql, params = []) {
  const p = getDbPool();
  return await p.query(sql, params);
}

/**
 * Obtain a connection from pool for transactions
 */
export async function getConnection() {
  const p = getDbPool();
  return await p.getConnection();
}

/**
 * Test MySQL connection
 */
export async function testDbConnection() {
  try {
    const p = getDbPool();
    const [rows] = await p.query('SELECT 1 + 1 AS result');
    return { connected: true, result: rows[0].result };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      code: error.code,
    };
  }
}

/**
 * Close pool during graceful shutdown
 */
export async function closeDbPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
