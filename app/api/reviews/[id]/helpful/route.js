import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/guards'
import { voteHelpful } from '@/lib/repo/reviews'

// One vote per person per review (previously the counter could be pumped up by clicking repeatedly)
export const POST = withAuth(async (_req, { params }, auth) => {
  const r = await voteHelpful({ reviewId: (await params).id, userId: auth.uid })
  return NextResponse.json(r)
})