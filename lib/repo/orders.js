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

export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

/** Timeline event as an object (event() above returns the same thing as a JSON string). */
export const makeEvent = (status, note) => ({ status, timestamp: new Date().toISOString(), note })

/**
 * Append one event to an order's timeline AND update other columns, atomically.
 * Call inside tx(conn). Deliberately does NOT use JSON_ARRAY_APPEND / CAST(... AS JSON):
 * Hostinger's database may be MariaDB, which doesn't support CAST(... AS JSON). The row is locked,
 * the array is edited in JS, and written back, which behaves identically on MySQL 8 and MariaDB.
 * `set` keys are internal column names (never user input).
 */
export async function addOrderEvent(conn, orderId, evt, set = {}) {
  const [[row]] = await conn.query('SELECT timeline FROM orders WHERE id = ? FOR UPDATE', [orderId])
  if (!row) return false
  const timeline = json(row.timeline, [])
  timeline.push(evt)
  const cols = { ...set, timeline: JSON.stringify(timeline) }
  const keys = Object.keys(cols)
  await conn.query(`UPDATE orders SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => cols[k]), orderId])
  return true
}