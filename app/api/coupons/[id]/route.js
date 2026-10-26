import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAdmin } from '@/lib/auth/guards'
import { couponCols } from '@/lib/repo/coupons'

export const PUT = withAdmin(async (req, { params }) => {
  const c = couponCols(await req.json())
  if (c.error) return NextResponse.json({ error: c.error }, { status: 400 })
  const keys = Object.keys(c.cols)
  try { await query(`UPDATE coupons SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`, [...keys.map((k) => c.cols[k]), (await params).id]) }
  catch (e) { if (e.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: `Coupon code "${c.cols.code}" already exists` }, { status: 409 }); throw e }
  return NextResponse.json({ ok: true })
})
// toggle active
export const PATCH = withAdmin(async (req, { params }) => {
  const { isActive } = await req.json()
  await query('UPDATE coupons SET is_active=? WHERE id=?', [isActive ? 1 : 0, (await params).id]); return NextResponse.json({ ok: true })
})
export const DELETE = withAdmin(async (_req, { params }) => {
  await query('DELETE FROM coupons WHERE id=?', [(await params).id]); return NextResponse.json({ ok: true })
})
