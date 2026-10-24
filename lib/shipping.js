// lib/shipping.js — pure shipping logic, extracted from lib/firebase/shipping.js (usable on client AND server)
// Default config — used when no settings exist yet
export const DEFAULT_SHIPPING = {
  baseCharge: 49,           // flat shipping fee in ₹
  freeAbove: 499,           // order total above which shipping is free (0 = never free)
  freeShippingEnabled: true,
  codEnabled: true,
  codFee: 20,               // COD handling fee in ₹
  codFreeAbove: 0,          // order total above which COD fee is waived (0 = never waived)
  codFeeWaiverEnabled: false,
  freeRules: [
    // Extra free-shipping rules (applied on top of freeAbove)
    // e.g. { type: 'category', value: 'electronics', label: 'All electronics' }
    // e.g. { type: 'minItems', value: 5, label: 'Orders with 5+ items' }
  ],
  updatedAt: null,
}


/**
 * Calculate shipping for a given order.
 * @param {number} orderTotal - cart total after tax
 * @param {string} paymentMethod - 'razorpay' | 'cod'
 * @param {Array}  items - cart items (for rule matching)
 * @param {object} config - result of getShippingConfig()
 */
export function calculateShipping(orderTotal, paymentMethod, items = [], config = DEFAULT_SHIPPING) {
  // ── Free shipping check ──────────────────────────────────────
  let shippingFree = false

  if (config.freeShippingEnabled) {
    if (config.freeAbove > 0 && orderTotal >= config.freeAbove) {
      shippingFree = true
    }
  }

  // Extra free-shipping rules
  if (!shippingFree && config.freeRules?.length) {
    for (const rule of config.freeRules) {
      if (rule.type === 'minItems' && items.length >= rule.value) {
        shippingFree = true; break
      }
      if (rule.type === 'category') {
        const hasCategory = items.some((i) => i.category === rule.value)
        if (hasCategory) { shippingFree = true; break }
      }
    }
  }

  const shippingCharge = shippingFree ? 0 : (config.baseCharge || 0)

  // ── COD fee check ────────────────────────────────────────────
  let codCharge = 0
  if (paymentMethod === 'cod' && config.codEnabled) {
    codCharge = config.codFee || 0

    if (config.codFeeWaiverEnabled && config.codFreeAbove > 0) {
      if (orderTotal >= config.codFreeAbove) codCharge = 0
    }
  }

  return {
    shippingCharge,
    shippingFree,
    codCharge,
    total: orderTotal + shippingCharge + codCharge,
    breakdown: {
      subtotal: orderTotal,
      shipping: shippingCharge,
      codFee: codCharge,
    },
  }
}