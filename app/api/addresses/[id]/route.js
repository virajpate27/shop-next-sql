import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAuth } from '@/lib/auth/guards'
export const DELETE = withAuth(async (_req, { params }, auth) => {
  await query('DELETE FROM addresses WHERE id=? AND user_id=?', [(await params).id, auth.uid]); return NextResponse.json({ ok: true })
})
