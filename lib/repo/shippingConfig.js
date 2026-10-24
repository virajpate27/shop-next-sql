import { one, json } from '@/lib/db'
import { DEFAULT_SHIPPING } from '@/lib/shipping'

export async function getShippingConfigServer(conn) {
  const sql = "SELECT value FROM settings WHERE `key`='shipping'"
  const row = conn ? (await conn.query(sql))[0][0] : await one(sql)
  return { ...DEFAULT_SHIPPING, ...(json(row?.value, {}) || {}) }
}
