import { iso, json } from '@/lib/db'
export const rowToReturn = (r, { admin = false } = {}) => r && ({
  id: r.id, orderId: r.order_id, userId: r.user_id, customerEmail: r.customer_email, status: r.status,
  reason: r.reason, customNote: r.custom_note || '', adminNote: r.admin_note || '', refundAmount: r.refund_amount,
  paymentMethod: r.payment_method, items: json(r.items, []), resolvedAt: iso(r.resolved_at),
  refundStatus: r.refund_status || null, razorpayRefundId: r.razorpay_refund_id || null, refundReference: r.refund_reference || '',
  ...(admin ? { refundError: r.refund_error || '' } : {}),   // Razorpay's error text is for admins only
  createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
})