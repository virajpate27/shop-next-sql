// lib/repo/orders.js — server-only
import { iso, json } from "@/lib/db";

export function rowToOrder(r) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    status: r.status,
    paymentMethod: r.payment_method,
    subtotal: r.subtotal,
    totalTax: r.total_tax,
    shipping: r.shipping,
    codFee: r.cod_fee,
    discount: r.discount,
    total: r.total,
    couponId: r.coupon_id,
    couponCode: r.coupon_code,
    couponType: r.coupon_type,
    razorpayOrderId: r.razorpay_order_id,
    razorpayPaymentId: r.razorpay_payment_id,
    customerEmail: r.customer_email,
    items: json(r.items, []),
    taxBreakdown: json(r.tax_breakdown, []),
    shippingAddress: json(r.shipping_address, null),
    timeline: json(r.timeline, []),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

export const STATUS_NOTES = {
  processing: "Your items are being packed and prepared for dispatch.",
  shipped: "Your order has been shipped and is on its way.",
  delivered: "Your order has been delivered successfully.",
  cancelled: "Your order has been cancelled.",
};
export const event = (status, note) =>
  JSON.stringify({ status, timestamp: new Date().toISOString(), note });

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

/** Timeline event as an object (event() above returns the same thing as a JSON string). */
export const makeEvent = (status, note) => ({
  status,
  timestamp: new Date().toISOString(),
  note,
});

/**
 * Append one event to an order's timeline AND update other columns, atomically.
 * Call inside tx(conn). Deliberately does NOT use JSON_ARRAY_APPEND / CAST(... AS JSON):
 * Hostinger's database may be MariaDB, which doesn't support CAST(... AS JSON). The row is locked,
 * the array is edited in JS, and written back, which behaves identically on MySQL 8 and MariaDB.
 * `set` keys are internal column names (never user input).
 */
export async function addOrderEvent(conn, orderId, evt, set = {}) {
  const [[row]] = await conn.query(
    "SELECT timeline FROM orders WHERE id = ? FOR UPDATE",
    [orderId],
  );
  if (!row) return false;
  const timeline = json(row.timeline, []);
  timeline.push(evt);
  const cols = { ...set, timeline: JSON.stringify(timeline) };
  const keys = Object.keys(cols);
  await conn.query(
    `UPDATE orders SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`,
    [...keys.map((k) => cols[k]), orderId],
  );
  return true;
}

// ── Unpaid Razorpay orders ───────────────────────────────────────────────────────────────────────
const lineSig = (lines) =>
  JSON.stringify(
    lines.map((l) => [l.productId, l.variantId || null, l.quantity]).sort(),
  );
export const PENDING_REUSE_MINUTES = 30;
export const PENDING_EXPIRE_HOURS = 24;

/**
 * The customer closed the payment popup and clicked "Place order" again? Instead of piling up another unpaid order,
 * reuse their existing unpaid Razorpay order if it is IDENTICAL (same items, total, coupon, saved address) and recent.
 * Call inside tx(conn). Returns the order id or null. Stock/coupons are untouched either way (they're taken on payment).
 */
export async function findReusablePending(
  conn,
  userId,
  { lines, total, couponCode, addressId },
) {
  if (!addressId) return null;
  const [rows] = await conn.query(
    `SELECT id, total, coupon_code, items, shipping_address FROM orders
      WHERE user_id = ? AND payment_method = 'razorpay' AND status = 'pending' AND razorpay_payment_id IS NULL AND created_at > ?
      ORDER BY created_at DESC LIMIT 5 FOR UPDATE`,
    [userId, new Date(Date.now() - PENDING_REUSE_MINUTES * 60 * 1000)],
  );
  for (const r of rows) {
    const addr = json(r.shipping_address, null);
    if (
      Number(r.total) === Number(total) &&
      (r.coupon_code || null) === (couponCode || null) &&
      (addr?.id || null) === addressId &&
      lineSig(json(r.items, [])) === lineSig(lines)
    )
      return r.id;
  }
  return null;
}

/**
 * Cancel unpaid Razorpay orders older than `hours` (default 24h) that never received a payment.
 * Each order is re-checked under a row lock, so a payment arriving at the same moment always wins.
 */
export async function expireStalePendingOrders(
  txFn,
  queryFn,
  hours = PENDING_EXPIRE_HOURS,
) {
  const stale = await queryFn(
    `SELECT id FROM orders WHERE payment_method = 'razorpay' AND status = 'pending' AND razorpay_payment_id IS NULL AND created_at < ? LIMIT 200`,
    [new Date(Date.now() - hours * 3600 * 1000)],
  );
  let expired = 0;
  for (const { id } of stale) {
    const did = await txFn(async (conn) => {
      const [[o]] = await conn.query(
        "SELECT status, razorpay_payment_id FROM orders WHERE id = ? FOR UPDATE",
        [id],
      );
      if (!o || o.status !== "pending" || o.razorpay_payment_id) return false;
      return addOrderEvent(
        conn,
        id,
        makeEvent(
          "cancelled",
          "Payment was not completed, so this order expired automatically.",
        ),
        { status: "cancelled" },
      );
    });
    if (did) expired += 1;
  }
  return { checked: stale.length, expired };
}
