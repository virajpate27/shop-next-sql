// lib/repo/coupons.js — server-only
import { one, iso } from '@/lib/db'

export function rowToCoupon(r) {
  if (!r) return null
  return {
    id: r.id, code: r.code, description: r.description || '', discountType: r.discount_type,
    discountValue: r.discount_value, maxDiscount: r.max_discount, minOrder: r.min_order,
    maxUses: r.max_uses, usedCount: r.used_count, expiresAt: iso(r.expires_at), isActive: !!r.is_active,
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
  }
}

/** Returns { valid, coupon?, error? } — same rules as the old Firestore validateCoupon. */
export async function findValidCoupon(code, cartTotal, conn) {
  const sql = 'SELECT * FROM coupons WHERE code = ?'
  const row = conn ? (await conn.query(sql, [String(code).toUpperCase().trim()]))[0][0] : await one(sql, [String(code).toUpperCase().trim()])
  const c = rowToCoupon(row)
  if (!c) return { valid: false, error: 'Invalid coupon code' }
  if (!c.isActive) return { valid: false, error: 'This coupon is no longer active' }
  if (c.expiresAt && new Date() > new Date(c.expiresAt)) return { valid: false, error: 'This coupon has expired' }
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return { valid: false, error: 'This coupon has reached its usage limit' }
  if (c.minOrder > 0 && cartTotal < c.minOrder) return { valid: false, error: `Minimum order of ₹${c.minOrder} required for this coupon` }
  return { valid: true, coupon: c }
}

/** Atomic usage bump — can't exceed maxUses even with concurrent checkouts. Returns true if counted. */
export async function consumeCoupon(conn, couponId) {
  const [r] = await conn.query(
    'UPDATE coupons SET used_count = used_count + 1 WHERE id = ? AND (max_uses = 0 OR used_count < max_uses)', [couponId])
  return r.affectedRows === 1
}
