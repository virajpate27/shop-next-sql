// lib/returns.js — pure constants/logic (client + server)
export const RETURN_REASONS = [
  'Item damaged or defective',
  'Wrong item received',
  'Item not as described',
  'Size/fit issue',
  'Changed my mind',
  'Missing parts or accessories',
  'Other',
]

export const RETURN_STATUSES = {
  pending:  { label: 'Pending review',  color: 'amber' },
  approved: { label: 'Approved',         color: 'green' },
  rejected: { label: 'Rejected',         color: 'red'   },
  refunded: { label: 'Refunded',         color: 'blue'  },
}

export const RETURN_WINDOW_DAYS = 7 // days after delivery. The Returns policy page reads this same value.

export function isReturnEligible(order, windowDays = RETURN_WINDOW_DAYS) {
  if (!order) return { eligible: false, reason: 'Order not found' }
  if (order.status !== 'delivered') return { eligible: false, reason: 'Only delivered orders can be returned' }
  const deliveredEvent = order.timeline?.find((e) => e.status === 'delivered')
  if (!deliveredEvent) return { eligible: false, reason: 'Delivery not confirmed yet' }
  const daysDiff = Math.floor((new Date() - new Date(deliveredEvent.timestamp)) / (1000 * 60 * 60 * 24))
  if (daysDiff > windowDays) return { eligible: false, reason: `Return window of ${windowDays} days has expired` }
  return { eligible: true, daysRemaining: windowDays - daysDiff }
}
