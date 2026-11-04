import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { confirmRazorpayPayment } from '@/lib/repo/payments'

/**
 * Browser-side confirmation right after the Razorpay popup succeeds: verifies the signature, then runs the SAME
 * idempotent routine the webhook uses (status → confirmed, stock, coupon, timeline). If the webhook got there
 * first, this is a harmless no-op.
 */
export const POST = withAuth(async (req, _ctx, auth) => {
  const { razorpay_order_id: rid, razorpay_payment_id: pid, razorpay_signature: sig } = await req.json()
  if (!rid || !pid || !sig) throw new HttpError(400, 'Missing payment details')

  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${rid}|${pid}`).digest('hex')
  const a = Buffer.from(expected), b = Buffer.from(String(sig))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ verified: false, error: 'Invalid signature' }, { status: 400 })

  const r = await confirmRazorpayPayment({ razorpayOrderId: rid, paymentId: pid, userId: auth.uid })
  if (!r.found) throw new HttpError(404, 'Order not found for this payment')
  return NextResponse.json({ verified: true, orderId: r.orderId })
})