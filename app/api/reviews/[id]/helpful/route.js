import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAuth } from '@/lib/auth/guards'
export const POST = withAuth(async (_req, { params }) => {
  await query('UPDATE reviews SET helpful = helpful + 1 WHERE id=?', [(await params).id]); return NextResponse.json({ ok: true })
})
