import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAuth } from '@/lib/auth/guards'
export const GET = withAuth(async (_req, _c, auth) => {
  const rows = await query('SELECT product_id FROM wishlist WHERE user_id=? ORDER BY created_at', [auth.uid])
  return NextResponse.json({ wishlist: rows.map((r) => r.product_id) })
})
