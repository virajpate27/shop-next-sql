import { NextResponse } from 'next/server'
import { one } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rateLimit'
import { cancelOrder } from '@/lib/repo/payments'
import { rowToOrder } from '@/lib/repo/orders'
import { CANCEL_REASONS, CUSTOMER_CANCELLABLE } from '@/lib/orderCancel'
import { getEmailTemplate } from '@/emails/templates'
import { sendEmail } from '@/lib/sendEmail'

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Customer self-service cancellation: only the owner, only before we start preparing the order (pending / confirmed).
// Paid online orders are refunded in full through Razorpay automatically; stock is restored.
export const POST = withAuth(async (req, { params }, auth) => {
  if (!rateLimit(`cancel:${auth.uid}`, { max: 10, windowMs: 60 * 60 * 1000 }).ok) throw new HttpError(429, 'Too many attempts. Please try again later.')
  const id = (await params).id
  const { reason = '' } = await req.json().catch(() => ({}))
  const cleanReason = CANCEL_REASONS.includes(reason) ? reason : '' // fixed list only: free text never reaches the timeline or emails
  const note = cleanReason ? `Cancelled by you: ${cleanReason}.` : 'Cancelled by you.'

  const result = await cancelOrder({
    orderId: id, note, allowRefund: true, ownerId: auth.uid, allowedStatuses: CUSTOMER_CANCELLABLE,
    blockedMessage: 'Your order is already being prepared or shipped, so it can no longer be cancelled online. Please contact us and we will help.',
  })

  if (!result.already) { // emails are best-effort: sendEmail never throws and never blocks for long
    const order = rowToOrder(await one('SELECT * FROM orders WHERE id=?', [id]))
    const tasks = []
    if (order?.customerEmail) {
      const t = getEmailTemplate('order_status', { order, orderId: id, newStatus: 'cancelled' })
      if (t) tasks.push(sendEmail({ to: order.customerEmail, subject: t.subject, html: t.html }))
    }
    const admin = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (admin && order) {
      tasks.push(sendEmail({
        to: admin, subject: `[Customer cancelled] Order #${id.slice(0, 8).toUpperCase()}`,
        html: `<p>The customer cancelled order <b>#${esc(id.slice(0, 8).toUpperCase())}</b> (${esc(order.customerEmail)}) before it was prepared.</p>
               <p>Reason: ${esc(cleanReason || 'not given')}.<br/>${result.refunded ? 'A full refund was sent through Razorpay.' : 'Nothing was paid online, so no refund was needed.'} Stock has been restored.</p>`,
      }))
    }
    await Promise.allSettled(tasks)
  }
  return NextResponse.json({ ok: true, refunded: !!result.refunded, already: !!result.already })
})