import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lavadoras',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: true,
});

/**
 * La base de datos no tiene AUTO_INCREMENT, así que el siguiente id se
 * calcula dentro de la transacción con un bloqueo de la tabla.
 */
export async function nextId(conn, table, column) {
  const [[row]] = await conn.query(
    `SELECT COALESCE(MAX(\`${column}\`), 0) + 1 AS id FROM \`${table}\` FOR UPDATE`,
  );
  return Number(row.id);
}

export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
