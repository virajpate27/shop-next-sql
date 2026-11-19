import { NextResponse } from 'next/server'
import { query, iso } from '@/lib/db'
import { withAdmin } from '@/lib/auth/guards'

// GET /api/admin/reviews?status=all|published|hidden&rating=1..5&q=text   (newest 300)
export const GET = withAdmin(async (req) => {
  const sp = new URL(req.url).searchParams
  const where = [], p = []
  const status = sp.get('status')
  if (status === 'published' || status === 'hidden') { where.push('status = ?'); p.push(status) }
  const rating = Number(sp.get('rating'))
  if (rating >= 1 && rating <= 5) { where.push('rating = ?'); p.push(rating) }
  const q = (sp.get('q') || '').trim().slice(0, 100)
  if (q) { where.push('(LOWER(comment) LIKE ? OR LOWER(display_name) LIKE ?)'); p.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`) }
  const rows = await query(`SELECT * FROM reviews ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 300`, p)

  // Product names / reviewer emails via separate lookups (no cross-table joins, so column collations can never clash)
  const pids = [...new Set(rows.map((r) => r.product_id))]
  const uids = [...new Set(rows.map((r) => r.user_id))]
  const products = pids.length ? await query('SELECT id, name, slug FROM products WHERE id IN (?)', [pids]) : []
  const users = uids.length ? await query('SELECT id, email FROM users WHERE id IN (?)', [uids]) : []
  const pmap = Object.fromEntries(products.map((x) => [x.id, x])), umap = Object.fromEntries(users.map((x) => [x.id, x.email]))

  return NextResponse.json({ reviews: rows.map((r) => ({
    id: r.id, productId: r.product_id, productName: pmap[r.product_id]?.name || '(deleted product)', productSlug: pmap[r.product_id]?.slug || '',
    displayName: r.display_name, email: umap[r.user_id] || '', rating: r.rating, comment: r.comment || '', helpful: r.helpful,
    verified: !!r.verified, status: r.status || 'published', createdAt: iso(r.created_at),
  })) })
})