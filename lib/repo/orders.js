// lib/repo/orders.js — server-only
import { iso, json } from '@/lib/db'

export function rowToOrder(r) {
  if (!r) return null
  return {
    id: r.id, userId: r.user_id, status: r.status, paymentMethod: r.payment_method,
    subtotal: r.subtotal, totalTax: r.total_tax, shipping: r.shipping, codFee: r.cod_fee, discount: r.discount, total: r.total,
    couponId: r.coupon_id, couponCode: r.coupon_code, couponType: r.coupon_type,
    razorpayOrderId: r.razorpay_order_id, razorpayPaymentId: r.razorpay_payment_id, customerEmail: r.customer_email,
    items: json(r.items, []), taxBreakdown: json(r.tax_breakdown, []), shippingAddress: json(r.shipping_address, null),
    timeline: json(r.timeline, []), createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
  }
}

export const STATUS_NOTES = {
  processing: 'Your items are being packed and prepared for dispatch.',
  shipped: 'Your order has been shipped and is on its way.',
  delivered: 'Your order has been delivered successfully.',
  cancelled: 'Your order has been cancelled.',
}
export const event = (status, note) => JSON.stringify({ status, timestamp: new Date().toISOString(), note })
