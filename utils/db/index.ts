import 'server-only';

import mysql from 'mysql2/promise';

const globalForDb = globalThis as unknown as { __lapahPool?: mysql.Pool };

const pool =
  globalForDb.__lapahPool ??
  mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lapah_db',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    queueLimit: 0,
    // Kembalikan kolom DATE/DATETIME sebagai string literal (tanpa konversi timezone)
    dateStrings: true,
  });

globalForDb.__lapahPool = pool;

export async function dbQuery<T = any>(sql: string, params?: any[]): Promise<T> {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results as T;
  } finally {
    connection.release();
  }
}

export async function dbQueryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const results = await dbQuery<T[]>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function dbClose() {
  return await pool.end();
}

export default pool;
