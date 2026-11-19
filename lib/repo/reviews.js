// lib/repo/reviews.js — server-only. Verified-purchase reviews, moderation, one-vote-per-person "helpful".
import { query, one, tx, newId, iso, json } from '@/lib/db'
import { HttpError } from '@/lib/auth/guards'
import { publicReviewName } from '@/lib/reviewName'

export const rowToReview = (r) => ({
  id: r.id, productId: r.product_id, userId: r.user_id, displayName: r.display_name, rating: r.rating,
  comment: r.comment || '', helpful: r.helpful, verified: !!r.verified, status: r.status || 'published', createdAt: iso(r.created_at),
})

/** Published reviews of a product, newest first. Falls back to "all reviews" until migration 003 has added the status column. */
export async function listPublishedReviews(productId, queryFn = query) {
  let rows
  try {
    rows = await queryFn("SELECT * FROM reviews WHERE product_id = ? AND status = 'published' ORDER BY created_at DESC", [productId])
  } catch (e) {
    if (e?.code !== 'ER_BAD_FIELD_ERROR') throw e
    rows = await queryFn('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [productId])
  }
  return rows.map(rowToReview)
}

/** Has this customer received (status "delivered") an order containing this product? */
export async function hasPurchased(userId, productId, queryFn = query) {
  const rows = await queryFn("SELECT items FROM orders WHERE user_id = ? AND status = 'delivered'", [userId])
  return rows.some((r) => json(r.items, []).some((i) => i.productId === productId))
}

/** What the product page needs to decide between "write a review", "you already reviewed", or "buy first". */
export async function reviewEligibility(userId, productId) {
  if (!userId) return { review: null, canReview: false, reason: 'login' }
  const mine = await one('SELECT * FROM reviews WHERE product_id = ? AND user_id = ?', [productId, userId])
  if (mine) return { review: rowToReview(mine), canReview: false, reason: 'already_reviewed' }
  const bought = await hasPurchased(userId, productId)
  return { review: null, canReview: bought, reason: bought ? null : 'not_purchased' }
}

/** Product rating/count come from PUBLISHED reviews only (hidden ones don't count). Call inside tx(conn). */
export async function recomputeRating(conn, productId) {
  const [rows] = await conn.query("SELECT rating FROM reviews WHERE product_id = ? AND status = 'published'", [productId])
  const n = rows.length
  const avg = n ? rows.reduce((s, r) => s + Number(r.rating), 0) / n : 0
  await conn.query('UPDATE products SET rating = ?, review_count = ? WHERE id = ?', [Math.round(avg * 10) / 10, n, productId])
  return { rating: Math.round(avg * 10) / 10, count: n }
}

export async function createReview({ userId, productId, rating, comment, displayName }) {
  const r = Math.round(Number(rating))
  if (!productId || !(r >= 1 && r <= 5)) throw new HttpError(400, 'Rating must be 1–5')
  const text = String(comment || '').trim().slice(0, 2000)
  if (text.length < 10) throw new HttpError(400, 'Please write at least 10 characters')

  return tx(async (conn) => {
    const [[p]] = await conn.query('SELECT id FROM products WHERE id = ? FOR UPDATE', [productId]) // serialises rating updates per product
    if (!p) throw new HttpError(404, 'Product not found')
    if (!(await hasPurchased(userId, productId, async (sql, params) => (await conn.query(sql, params))[0]))) {
      throw new HttpError(403, 'Only customers who have received this product can review it.')
    }
    const id = newId()
    try {
      await conn.query(
        "INSERT INTO reviews (id, product_id, user_id, display_name, rating, comment, verified, status) VALUES (?, ?, ?, ?, ?, ?, 1, 'published')",
        [id, productId, userId, publicReviewName(displayName), r, text])
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'You have already reviewed this product')
      throw e
    }
    await recomputeRating(conn, productId)
    return id
  })
}

/** Admin: hide / show a review. */
export async function setReviewStatus({ reviewId, status }) {
  if (!['published', 'hidden'].includes(status)) throw new HttpError(400, 'Invalid status')
  return tx(async (conn) => {
    const [[r]] = await conn.query('SELECT * FROM reviews WHERE id = ? FOR UPDATE', [reviewId])
    if (!r) throw new HttpError(404, 'Review not found')
    await conn.query('SELECT id FROM products WHERE id = ? FOR UPDATE', [r.product_id])
    await conn.query('UPDATE reviews SET status = ? WHERE id = ?', [status, reviewId])
    const agg = await recomputeRating(conn, r.product_id)
    return { productId: r.product_id, ...agg }
  })
}

/** Admin: delete a review (and its helpful votes). */
export async function deleteReview({ reviewId }) {
  return tx(async (conn) => {
    const [[r]] = await conn.query('SELECT * FROM reviews WHERE id = ? FOR UPDATE', [reviewId])
    if (!r) throw new HttpError(404, 'Review not found')
    await conn.query('SELECT id FROM products WHERE id = ? FOR UPDATE', [r.product_id])
    await conn.query('DELETE FROM review_votes WHERE review_id = ?', [reviewId])
    await conn.query('DELETE FROM reviews WHERE id = ?', [reviewId])
    const agg = await recomputeRating(conn, r.product_id)
    return { productId: r.product_id, ...agg }
  })
}

/** One "helpful" vote per person per review; not on your own review; hidden reviews can't be voted on. */
export async function voteHelpful({ reviewId, userId }) {
  return tx(async (conn) => {
    const [[r]] = await conn.query('SELECT id, user_id, status FROM reviews WHERE id = ? FOR UPDATE', [reviewId])
    if (!r || (r.status || 'published') !== 'published') throw new HttpError(404, 'Review not found')
    if (r.user_id === userId) throw new HttpError(400, 'You cannot vote on your own review')
    const [res] = await conn.query('INSERT IGNORE INTO review_votes (review_id, user_id) VALUES (?, ?)', [reviewId, userId])
    const voted = res.affectedRows === 1
    if (voted) await conn.query('UPDATE reviews SET helpful = helpful + 1 WHERE id = ?', [reviewId])
    const [[after]] = await conn.query('SELECT helpful FROM reviews WHERE id = ?', [reviewId])
    return { helpful: after.helpful, voted }
  })
}