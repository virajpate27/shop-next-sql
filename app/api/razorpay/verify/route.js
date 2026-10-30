import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { tx } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { applyStockChange } from '@/lib/repo/products'
import { consumeCoupon } from '@/lib/repo/coupons'
import { makeEvent, addOrderEvent } from '@/lib/repo/orders'

/**
 * Verifies the Razorpay signature AND finalises the order atomically:
 * status → confirmed, stock decremented, coupon consumed, timeline appended. Idempotent.
 * This replaces: razorpay/verify + updateOrderPayment + /api/orders/confirm + /api/coupons/use.
 */
export const POST = withAuth(async (req, _ctx, auth) => {
  const { razorpay_order_id: rid, razorpay_payment_id: pid, razorpay_signature: sig } = await req.json()
  if (!rid || !pid || !sig) throw new HttpError(400, 'Missing payment details')

  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${rid}|${pid}`).digest('hex')
  const a = Buffer.from(expected), b = Buffer.from(String(sig))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ verified: false, error: 'Invalid signature' }, { status: 400 })

  const orderId = await tx(async (conn) => {
    const [[o]] = await conn.query('SELECT * FROM orders WHERE razorpay_order_id=? AND user_id=? FOR UPDATE', [rid, auth.uid])
    if (!o) throw new HttpError(404, 'Order not found for this payment')
    
     // A payment that arrives after the order was auto-expired/cancelled is still REAL money: confirm it (admin can refund from Razorpay if needed)
    const lateButPaid = o.status === 'cancelled' && !o.razorpay_payment_id
    if (o.status !== 'pending' && !lateButPaid) return o.id // already confirmed — idempotent

    await addOrderEvent(conn, o.id,
      makeEvent('confirmed', lateButPaid ? 'Payment confirmed via Razorpay (received after the order had been cancelled)' : 'Payment confirmed via Razorpay'),
      { status: 'confirmed', razorpay_payment_id: pid })
      
      
    const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
    for (const l of items) await applyStockChange(conn, { productId: l.productId, variantId: l.variantId, qty: l.quantity, sale: true })
    if (o.coupon_id) await consumeCoupon(conn, o.coupon_id) // money is already captured: never fail the order over a coupon counter
    return o.id
  })
  return NextResponse.json({ verified: true, orderId })
})