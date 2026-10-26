import { NextResponse } from 'next/server'
import { query, newId } from '@/lib/db'
import { withAdmin } from '@/lib/auth/guards'
import { rowToCoupon, couponCols } from '@/lib/repo/coupons'

export const GET = withAdmin(async () => {
  const rows = await query('SELECT * FROM coupons ORDER BY created_at DESC')
  return NextResponse.json({ coupons: rows.map(rowToCoupon) })
})
export const POST = withAdmin(async (req) => {
  const c = couponCols(await req.json())
  if (c.error) return NextResponse.json({ error: c.error }, { status: 400 })
  const id = newId(), keys = Object.keys(c.cols)
  try {
    await query(`INSERT INTO coupons (id, ${keys.join(',')}, used_count) VALUES (?, ${keys.map(() => '?').join(',')}, 0)`, [id, ...keys.map((k) => c.cols[k])])
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: `Coupon code "${c.cols.code}" already exists` }, { status: 409 })
    throw e
  }
  return NextResponse.json({ id }, { status: 201 })
})
