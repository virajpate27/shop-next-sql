// lib/coupons.js — pure discount calc, extracted from lib/firebase/coupons.js
/**
 * Calculate how much discount a coupon gives.
 * Returns the rupee amount to subtract.
 */
export function calculateDiscount(coupon, cartTotal) {
  if (!coupon) return 0

  switch (coupon.discountType) {
    case 'flat':
      // Never discount more than the cart total
      return Math.min(Number(coupon.discountValue) || 0, cartTotal)

    case 'percent': {
      const pct = Math.min(Number(coupon.discountValue) || 0, 100)
      const raw = (cartTotal * pct) / 100
      // Apply max discount cap if set
      const maxDiscount = coupon.maxDiscount || Infinity
      return Math.min(raw, maxDiscount)
    }

    case 'free_shipping':
      // Handled separately in shipping calc — return 0 here
      return 0

    default:
      return 0
  }
}
