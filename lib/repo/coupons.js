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

/** Validate + map the admin form → DB columns. usedCount is never client-writable. */
export function couponCols(d = {}) {
  const code = String(d.code || '').toUpperCase().trim().replace(/\s+/g, '')
  if (!code) return { error: 'Coupon code is required' }
  if (!['flat', 'percent', 'free_shipping'].includes(d.discountType)) return { error: 'Invalid discount type' }
  const value = Number(d.discountValue) || 0
  if (d.discountType !== 'free_shipping' && value <= 0) return { error: 'Discount value is required' }
  if (d.discountType === 'percent' && value > 100) return { error: 'Percent discount cannot exceed 100' }
  const exp = d.expiresAt ? new Date(d.expiresAt) : null
  if (exp && Number.isNaN(exp.getTime())) return { error: 'Invalid expiry date' }
  return { cols: {
    code, description: d.description ? String(d.description).slice(0, 255) : null, discount_type: d.discountType,
    discount_value: value, max_discount: Number(d.maxDiscount) || 0, min_order: Number(d.minOrder) || 0,
    max_uses: Math.trunc(Number(d.maxUses)) || 0, expires_at: exp, is_active: d.isActive === false ? 0 : 1,
  } }
}
