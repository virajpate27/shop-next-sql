import { NextResponse } from 'next/server'
import { one, query, json } from '@/lib/db'
import { withAuth } from '@/lib/auth/guards'

export const GET = withAuth(async (_req, _c, auth) => {
  const r = await one('SELECT data FROM carts WHERE user_id=?', [auth.uid])
  return NextResponse.json({ cart: r ? json(r.data, null) : null })
})
export const PUT = withAuth(async (req, _c, auth) => {
  const b = await req.json()
  const data = { items: Array.isArray(b.items) ? b.items.slice(0, 100) : [], appliedCoupon: b.appliedCoupon || null, couponDiscount: Number(b.couponDiscount) || 0 }
  await query('INSERT INTO carts (user_id, data) VALUES (?,?) ON DUPLICATE KEY UPDATE data=VALUES(data)', [auth.uid, JSON.stringify(data)])
  return NextResponse.json({ ok: true })
})
