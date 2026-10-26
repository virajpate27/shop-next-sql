import { NextResponse } from 'next/server'
import { query, tx } from '@/lib/db'
import { withAuth } from '@/lib/auth/guards'
import { rowToAddress, cleanAddress, newAddressId } from '@/lib/repo/addresses'

export const GET = withAuth(async (_req, _c, auth) => {
  const rows = await query('SELECT * FROM addresses WHERE user_id=? ORDER BY created_at', [auth.uid])
  return NextResponse.json({ addresses: rows.map(rowToAddress) })
})
export const POST = withAuth(async (req, _c, auth) => {
  const a = cleanAddress(await req.json()), id = newAddressId()
  await query('INSERT INTO addresses (id,user_id,data) VALUES (?,?,?)', [id, auth.uid, JSON.stringify(a)])
  return NextResponse.json({ address: { ...a, id } }, { status: 201 })
})
// Replace the user's whole list (edit / default toggle) — same semantics as the old updateAddresses()
export const PUT = withAuth(async (req, _c, auth) => {
  const { addresses } = await req.json()
  if (!Array.isArray(addresses) || addresses.length > 20) return NextResponse.json({ error: 'Invalid addresses' }, { status: 400 })
  const saved = await tx(async (conn) => {
    const [rows] = await conn.query('SELECT id FROM addresses WHERE user_id=? FOR UPDATE', [auth.uid])
    const mine = new Set(rows.map((r) => r.id)), keep = [], out = []
    for (const raw of addresses) {
      const a = cleanAddress(raw)
      if (raw.id && mine.has(raw.id)) { await conn.query('UPDATE addresses SET data=? WHERE id=? AND user_id=?', [JSON.stringify(a), raw.id, auth.uid]); keep.push(raw.id); out.push({ ...a, id: raw.id }) }
      else { const id = newAddressId(); await conn.query('INSERT INTO addresses (id,user_id,data) VALUES (?,?,?)', [id, auth.uid, JSON.stringify(a)]); keep.push(id); out.push({ ...a, id }) }
    }
    const drop = [...mine].filter((id) => !keep.includes(id))
    if (drop.length) await conn.query('DELETE FROM addresses WHERE user_id=? AND id IN (?)', [auth.uid, drop])
    return out
  })
  return NextResponse.json({ addresses: saved })
})
