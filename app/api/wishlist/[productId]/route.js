import { NextResponse } from 'next/server'
import { query, one } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'
export const POST = withAuth(async (_req, { params }, auth) => {
  const pid = (await params).productId
  if (!(await one('SELECT id FROM products WHERE id=?', [pid]))) throw new HttpError(404, 'Product not found')
  await query('INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?,?)', [auth.uid, pid]); return NextResponse.json({ ok: true })
})
export const DELETE = withAuth(async (_req, { params }, auth) => {
  await query('DELETE FROM wishlist WHERE user_id=? AND product_id=?', [auth.uid, (await params).productId]); return NextResponse.json({ ok: true })
})
