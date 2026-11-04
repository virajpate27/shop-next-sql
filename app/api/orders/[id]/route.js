import { NextResponse } from 'next/server'
import { one, query } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { rowToOrder, STATUS_NOTES, ORDER_STATUSES } from '@/lib/repo/orders'
import { cancelOrder, setOrderStatus } from '@/lib/repo/payments'

// Customers poll this every few seconds on /orders/[id] (replaces onSnapshot)
export const GET = withAuth(async (_req, { params }, auth) => {
  const o = rowToOrder(await one('SELECT * FROM orders WHERE id=?', [(await params).id]))
  if (!o) throw new HttpError(404, 'Order not found')
  if (o.userId !== auth.uid && auth.role !== 'admin') throw new HttpError(403, 'Access denied — not your order')
  return NextResponse.json({ order: o })
})

// Admin: change status.  "cancelled" refunds paid online orders (needs { refund: true } confirmation) and restores stock.
export const PATCH = withAuth(async (req, { params }, auth) => {
  if (auth.role !== 'admin') throw new HttpError(403, 'Access denied — admin only')
  const { status, note = '', refund = false } = await req.json()
  if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'Invalid status')
  const id = (await params).id
  const cleanNote = String(note || '').slice(0, 500)

  if (status === 'cancelled') {
    const r = await cancelOrder({ orderId: id, note: cleanNote || STATUS_NOTES.cancelled, allowRefund: refund === true })
    return NextResponse.json({ ok: true, ...r })
  }
  const found = await setOrderStatus({ orderId: id, status, note: cleanNote || STATUS_NOTES[status] || `Order status updated to ${status}` })
  if (!found) throw new HttpError(404, 'Order not found')
  return NextResponse.json({ ok: true })
})

export const DELETE = withAuth(async (_req, { params }, auth) => {
  if (auth.role !== 'admin') throw new HttpError(403, 'Access denied — admin only')
  await query('DELETE FROM orders WHERE id=?', [(await params).id])
  return NextResponse.json({ ok: true })
})