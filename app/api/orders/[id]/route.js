import { NextResponse } from 'next/server'
import { one, query, tx } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { rowToOrder, STATUS_NOTES, ORDER_STATUSES, makeEvent, addOrderEvent } from '@/lib/repo/orders'

// Customers poll this every few seconds on /orders/[id] (replaces onSnapshot)
export const GET = withAuth(async (_req, { params }, auth) => {
  const o = rowToOrder(await one('SELECT * FROM orders WHERE id=?', [(await params).id]))
  if (!o) throw new HttpError(404, 'Order not found')
  if (o.userId !== auth.uid && auth.role !== 'admin') throw new HttpError(403, 'Access denied — not your order')
  return NextResponse.json({ order: o })
})

// Admin: change status (replaces updateOrderStatus)
export const PATCH = withAuth(async (req, { params }, auth) => {
  if (auth.role !== 'admin') throw new HttpError(403, 'Access denied — admin only')
  const { status, note = '' } = await req.json()
  if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'Invalid status')
  const msg = String(note || '').slice(0, 500) || STATUS_NOTES[status] || `Order status updated to ${status}`
  const id = (await params).id
  const found = await tx((conn) => addOrderEvent(conn, id, makeEvent(status, msg), { status }))
  if (!found) throw new HttpError(404, 'Order not found')
  return NextResponse.json({ ok: true })
})

export const DELETE = withAuth(async (_req, { params }, auth) => {
  if (auth.role !== 'admin') throw new HttpError(403, 'Access denied — admin only')
  await query('DELETE FROM orders WHERE id=?', [(await params).id])
  return NextResponse.json({ ok: true })
})