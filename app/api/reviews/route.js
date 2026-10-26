import { NextResponse } from 'next/server'
import { query, one, tx, newId, iso } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { verifySession, COOKIE } from '@/lib/auth/session'

const row = (r) => ({ id: r.id, productId: r.product_id, userId: r.user_id, displayName: r.display_name, rating: r.rating, comment: r.comment || '', helpful: r.helpful, createdAt: iso(r.created_at) })

// GET /api/reviews?productId=X            → all reviews (public)
// GET /api/reviews?productId=X&mine=1     → current user's review or null
export async function GET(req) {
  const sp = new URL(req.url).searchParams, productId = sp.get('productId')
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })
  if (sp.get('mine') === '1') {
    const uid = await verifySession(req.cookies.get(COOKIE)?.value)
    if (!uid) return NextResponse.json({ review: null })
    const r = await one('SELECT * FROM reviews WHERE product_id=? AND user_id=?', [productId, uid])
    return NextResponse.json({ review: r ? row(r) : null })
  }
  const rows = await query('SELECT * FROM reviews WHERE product_id=? ORDER BY created_at DESC', [productId])
  return NextResponse.json({ reviews: rows.map(row) })
}

// POST — one review per user per product; display name comes from the account, rating recomputed in the same tx
export const POST = withAuth(async (req, _c, auth) => {
  const { productId, rating, comment } = await req.json()
  const r = Math.round(Number(rating))
  if (!productId || !(r >= 1 && r <= 5)) throw new HttpError(400, 'Rating must be 1–5')
  const text = String(comment || '').trim().slice(0, 2000)
  const id = await tx(async (conn) => {
    const [[p]] = await conn.query('SELECT id FROM products WHERE id=? FOR UPDATE', [productId])
    if (!p) throw new HttpError(404, 'Product not found')
    const [[u]] = await conn.query('SELECT display_name, email FROM users WHERE id=?', [auth.uid])
    const rid = newId()
    try {
      await conn.query('INSERT INTO reviews (id,product_id,user_id,display_name,rating,comment) VALUES (?,?,?,?,?,?)',
        [rid, productId, auth.uid, u?.display_name || u?.email?.split('@')[0] || 'Customer', r, text])
    } catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'You have already reviewed this product'); throw e }
    const [[agg]] = await conn.query('SELECT AVG(rating) a, COUNT(*) n FROM reviews WHERE product_id=?', [productId])
    await conn.query('UPDATE products SET rating=?, review_count=? WHERE id=?', [Math.round(Number(agg.a) * 10) / 10, agg.n, productId])
    return rid
  })
  return NextResponse.json({ id }, { status: 201 })
})
