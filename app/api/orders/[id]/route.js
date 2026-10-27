import { NextResponse } from 'next/server'
import { one, query, pool } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { rowToOrder, STATUS_NOTES, event } from '@/lib/repo/orders'

// Customers poll this every few seconds on /orders/[id] (replaces onSnapshot)
export const GET = withAuth(async (_req, { params }, auth) => {
  const o = rowToOrder(await one('SELECT * FROM orders WHERE id=?', [(await params).id]))
  if (!o) throw new HttpError(404, 'Order not found')
  if (o.userId !== auth.uid && auth.role !== 'admin') throw new HttpError(403, 'Access denied — not your order')
  return NextResponse.json({ order: o })
})

// Admin: change status (replaces updateOrderStatus)

export const PATCH = withAuth(async (req, { params }, auth) => {
  if (auth.role !== 'admin') {
    throw new HttpError(403, 'Access denied — admin only')
  }

  const body = await req.json().catch(() => ({}))

  const status =
    typeof body.status === 'string'
      ? body.status.trim().toLowerCase()
      : ''

  const allowedStatuses = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ]

  if (!allowedStatuses.includes(status)) {
    throw new HttpError(400, 'Invalid order status')
  }

  const note =
    typeof body.note === 'string'
      ? body.note.trim().slice(0, 500)
      : ''

  const msg =
    note ||
    STATUS_NOTES[status] ||
    `Order status updated to ${status}`

  const orderId = (await params).id

  const [result] = await pool.query(
    `UPDATE orders
     SET status = ?,
         timeline = JSON_ARRAY_APPEND(
           COALESCE(timeline, JSON_ARRAY()),
           '$',
           JSON_OBJECT(
             'status', ?,
             'timestamp', ?,
             'note', ?
           )
         )
     WHERE id = ?`,
    [
      status,
      status,
      new Date().toISOString(),
      msg,
      orderId,
    ]
  )

  if (result.affectedRows === 0) {
    const existing = await one(
      'SELECT id FROM orders WHERE id = ?',
      [orderId]
    )

    if (!existing) {
      throw new HttpError(404, 'Order not found')
    }
  }

  return NextResponse.json({ ok: true })
})


export const DELETE = withAuth(async (_req, { params }, auth) => {
  if (auth.role !== 'admin') throw new HttpError(403, 'Access denied — admin only')
  await query('DELETE FROM orders WHERE id=?', [(await params).id])
  return NextResponse.json({ ok: true })
})
