import { iso, json } from '@/lib/db'
export const rowToReturn = (r) => r && ({
  id: r.id, orderId: r.order_id, userId: r.user_id, customerEmail: r.customer_email, status: r.status,
  reason: r.reason, customNote: r.custom_note || '', adminNote: r.admin_note || '', refundAmount: r.refund_amount,
  paymentMethod: r.payment_method, items: json(r.items, []), resolvedAt: iso(r.resolved_at),
  createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
})
