import Razorpay from 'razorpay'
import { NextResponse } from 'next/server'
import { one, query } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'

const getRazorpay = () => new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) // lazy: never crashes the build

// Amount now comes from OUR order row, not from the browser.
export const POST = withAuth(async (req, _ctx, auth) => {
  const { orderId } = await req.json()
  const o = await one('SELECT id,total,status,payment_method,user_id,razorpay_order_id FROM orders WHERE id=?', [orderId])
  if (!o || o.user_id !== auth.uid) throw new HttpError(404, 'Order not found')
  if (o.payment_method !== 'razorpay' || o.status !== 'pending') throw new HttpError(409, 'Order is not awaiting payment')

  // Already created for this order (double-click / retry)? Reuse it — a second Razorpay order would orphan the first payment.
  if (o.razorpay_order_id) {
    return NextResponse.json({ orderId: o.razorpay_order_id, amount: Math.round(o.total * 100), currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID })
  }

  const rzp = await getRazorpay().orders.create({ amount: Math.round(o.total * 100), currency: 'INR', receipt: o.id, payment_capture: 1 })
  await query('UPDATE orders SET razorpay_order_id=? WHERE id=?', [rzp.id, o.id])
  return NextResponse.json({ orderId: rzp.id, amount: rzp.amount, currency: rzp.currency, keyId: process.env.RAZORPAY_KEY_ID })
})
