import { NextResponse } from 'next/server'
import { query, one, newId } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { rowToOrder } from '@/lib/repo/orders'
import { rowToReturn } from '@/lib/repo/returns'
import { RETURN_REASONS, isReturnEligible } from '@/lib/returns'

// POST — server re-derives items/prices/refund from the real order; client only says WHICH items and how many
export const POST = withAuth(async (req, _c, auth) => {
  const b = await req.json()
  const order = rowToOrder(await one('SELECT * FROM orders WHERE id=?', [b.orderId]))
  if (!order || order.userId !== auth.uid) throw new HttpError(404, 'Order not found')
  const elig = isReturnEligible(order)
  if (!elig.eligible) throw new HttpError(400, elig.reason)
  if (await one('SELECT id FROM returns WHERE order_id=?', [order.id])) throw new HttpError(409, 'A return request already exists for this order')
  if (!RETURN_REASONS.includes(b.reason)) throw new HttpError(400, 'Please select a valid reason')
  if (!Array.isArray(b.items) || !b.items.length) throw new HttpError(400, 'Select at least one item')

  const items = b.items.map((it) => {
    const oi = order.items.find((x) => x.productId === it.productId && (x.variantId || null) === (it.variantId || null))
    if (!oi) throw new HttpError(400, 'Item is not part of this order')
    const returnQty = Math.min(Math.max(1, Math.floor(Number(it.returnQty) || 1)), oi.quantity)
    return { productId: oi.productId, name: oi.name, image: oi.image || null, variantId: oi.variantId || null,
             variantLabel: oi.variantLabel || null, price: oi.price, quantity: oi.quantity, returnQty }
  })
  const refund = Math.round(items.reduce((s, i) => s + i.price * i.returnQty, 0) * 100) / 100
  const id = newId()
  await query(
    `INSERT INTO returns (id,order_id,user_id,customer_email,status,reason,custom_note,refund_amount,payment_method,items)
     VALUES (?,?,?,?, 'pending', ?,?,?,?,?)`,
    [id, order.id, auth.uid, order.customerEmail || auth.email, b.reason, String(b.customNote || '').slice(0, 2000), refund, order.paymentMethod, JSON.stringify(items)])
  return NextResponse.json({ id, refundAmount: refund }, { status: 201 })
})

// GET ?orderId=X → { return } (owner/admin)   ?all=1 or ?userId=X → { returns } (admin)   (none) → my returns
export const GET = withAuth(async (req, _c, auth) => {
  const sp = new URL(req.url).searchParams, admin = auth.role === 'admin'
  if (sp.get('orderId')) {
    const r = await one('SELECT * FROM returns WHERE order_id=?', [sp.get('orderId')])
    if (r && r.user_id !== auth.uid && !admin) throw new HttpError(403, 'Access denied')
    return NextResponse.json({ return: rowToReturn(r) })
  }
  let rows
  if (sp.get('all') === '1' || sp.get('userId')) {
    if (!admin) throw new HttpError(403, 'Access denied — admin only')
    rows = sp.get('userId') ? await query('SELECT * FROM returns WHERE user_id=? ORDER BY created_at DESC', [sp.get('userId')])
                            : await query('SELECT * FROM returns ORDER BY created_at DESC')
  } else rows = await query('SELECT * FROM returns WHERE user_id=? ORDER BY created_at DESC', [auth.uid])
  return NextResponse.json({ returns: rows.map(rowToReturn) })
})
