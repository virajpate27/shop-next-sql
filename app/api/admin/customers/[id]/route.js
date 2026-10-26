import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAdmin, HttpError } from '@/lib/auth/guards'
import { rowToOrder } from '@/lib/repo/orders'
import { rowToReturn } from '@/lib/repo/returns'

// GET ?part=orders|returns|reviews
export const GET = withAdmin(async (req, { params }) => {
  const id = (await params).id, part = new URL(req.url).searchParams.get('part')
  if (part === 'orders') return NextResponse.json({ orders: (await query('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', [id])).map(rowToOrder) })
  if (part === 'returns') return NextResponse.json({ returns: (await query('SELECT * FROM returns WHERE user_id=? ORDER BY created_at DESC', [id])).map(rowToReturn) })
  if (part === 'reviews') {
    const rows = await query('SELECT * FROM reviews WHERE user_id=? ORDER BY created_at DESC', [id])
    return NextResponse.json({ reviews: rows.map((r) => ({ id: r.id, productId: r.product_id, userId: r.user_id, displayName: r.display_name, rating: r.rating, comment: r.comment, helpful: r.helpful, createdAt: r.created_at })) })
  }
  throw new HttpError(400, 'part required')
})
export const PATCH = withAdmin(async (req, { params }, auth) => {
  const id = (await params).id, { blocked } = await req.json()
  if (id === auth.uid) throw new HttpError(400, 'You cannot block your own account')
  await query('UPDATE users SET blocked=? WHERE id=?', [blocked ? 1 : 0, id]); return NextResponse.json({ ok: true })
})
