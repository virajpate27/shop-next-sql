// → save as app/api/coupons/validate/route.js
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/guards'
import { findValidCoupon } from '@/lib/repo/coupons'
import { calculateDiscount } from '@/lib/coupons'

export const POST = withAuth(async (req) => {
  const { code, cartTotal } = await req.json()
  if (!code?.trim()) return NextResponse.json({ valid: false, error: 'Please enter a coupon code' }, { status: 400 })
  if (!cartTotal || cartTotal <= 0) return NextResponse.json({ valid: false, error: 'Cart is empty' }, { status: 400 })
  const v = await findValidCoupon(code, Number(cartTotal))
  if (!v.valid) return NextResponse.json(v)
  return NextResponse.json({ valid: true, coupon: v.coupon, discount: Math.round(calculateDiscount(v.coupon, Number(cartTotal)) * 100) / 100 })
})
