// lib/orderCancel.js — rules for customer-side cancellation (shared by the page and the API)

/** A customer can cancel on their own only before we start preparing the order. */
export const CUSTOMER_CANCELLABLE = ['pending', 'confirmed']

export const CANCEL_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Delivery will take too long',
  'Want to change the items or address',
  'Other',
]

export const canCustomerCancel = (order) =>
  !!order && CUSTOMER_CANCELLABLE.includes(order.status) && order.refundStatus !== 'processing'