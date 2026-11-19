import { NextResponse } from 'next/server'
import { one } from '@/lib/db'
import { withAuth, HttpError, getSessionUser } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rateLimit'
import { listPublishedReviews, reviewEligibility, createReview } from '@/lib/repo/reviews'

// GET /api/reviews?productId=X            → published reviews (public)
// GET /api/reviews?productId=X&mine=1     → { review, canReview, reason } for the signed-in visitor
//     reason: 'login' | 'not_purchased' | 'already_reviewed' | null
export async function GET(req) {
  const sp = new URL(req.url).searchParams, productId = sp.get('productId')
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  if (sp.get('mine') === '1') {
    const u = await getSessionUser(req)
    return NextResponse.json(await reviewEligibility(u?.id || null, productId), { headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json({ reviews: await listPublishedReviews(productId) })
}

// POST — only customers with a DELIVERED order containing the product; the badge and name come from the server
export const POST = withAuth(async (req, _c, auth) => {
  if (!rateLimit(`review:${auth.uid}`, { max: 10, windowMs: 60 * 60 * 1000 }).ok) throw new HttpError(429, 'Too many reviews. Please try again later.')
  const { productId, rating, comment } = await req.json().catch(() => ({}))
  const u = await one('SELECT display_name FROM users WHERE id=?', [auth.uid])
  const id = await createReview({ userId: auth.uid, productId, rating, comment, displayName: u?.display_name })
  return NextResponse.json({ id }, { status: 201 })
})