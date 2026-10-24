// lib/db.js — MySQL pool (server-only). Import ONLY from route handlers / server components.
import mysql from 'mysql2/promise'
import crypto from 'node:crypto'

// Reuse one pool across hot reloads / route bundles
const g = globalThis
export const pool =
  g.__shopPool ||
  (g.__shopPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',                 // store & read everything as UTC
    decimalNumbers: true,          // DECIMAL -> JS number (matches current app behaviour)
    waitForConnections: true,
    // Managed MySQL has a per-user connection cap — keep this low.
    connectionLimit: Number(process.env.DB_POOL || 5),
    queueLimit: 0,
  }))

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params)
  return rows
}
export async function one(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] || null
}

/** Run fn(conn) inside a transaction; commits on success, rolls back on throw. */
export async function tx(fn) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export const newId = () => crypto.randomUUID()
export const iso = (d) => (d ? new Date(d).toISOString() : null)
export const json = (v, fallback = null) => {
  if (v == null) return fallback
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { return fallback } }
  return v
}
