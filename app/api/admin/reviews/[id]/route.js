import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/guards'
import { setReviewStatus, deleteReview } from '@/lib/repo/reviews'

// Hide / show a review (the product's rating and review count are recomputed from published reviews only)
export const PATCH = withAdmin(async (req, { params }) => {
  const { status } = await req.json().catch(() => ({}))
  return NextResponse.json({ ok: true, ...(await setReviewStatus({ reviewId: (await params).id, status })) })
})

export const DELETE = withAdmin(async (_req, { params }) => {
  return NextResponse.json({ ok: true, ...(await deleteReview({ reviewId: (await params).id })) })
})