import mysql from 'mysql2/promise';
import config from './config.js';
import { logger } from './logger.js';

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: config.db.connectionLimit,
  dateStrings: config.db.dateStrings,
  namedPlaceholders: false,
});

// Transacción helper: ejecuta fn(connection) dentro de BEGIN/COMMIT y hace
// ROLLBACK ante cualquier error.
export async function conTransaccion(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    try { await conn.rollback(); } catch { /* rollback best-effort */ }
    throw err;
  } finally {
    conn.release();
  }
}

export async function ping() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0].ok === 1;
}

export async function cerrarPool() {
  await pool.end();
  logger.info('pool mysql cerrado');
}
