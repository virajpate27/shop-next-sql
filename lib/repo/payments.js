// lib/repo/payments.js — server-only. Everything that moves money or finalises a paid order lives here.
//
//  confirmRazorpayPayment  one idempotent "this online order is paid" routine, used by BOTH the browser
//                          confirmation (/api/razorpay/verify) and the Razorpay webhook. Whoever arrives first wins.
//  refundReturn            approved return → real Razorpay refund (or manual record for COD) + restock, exactly once
//  cancelOrder             cancel an order; paid online orders are refunded through Razorpay; stock is restored
//  setOrderStatus          every other status change, with safety rules
//  handleRazorpayEvent     webhook events: payment.captured / order.paid / refund.*
//
// Refund pattern (money + external API): 1) lock the row and CLAIM it (refund_status='processing') and commit,
// 2) call Razorpay outside the transaction, 3) save the result. The claim makes a double-click or two admins
// impossible to double-refund; if the server dies after step 2, the refund.* webhook completes step 3.
import { tx, query, json } from '@/lib/db'
import { HttpError } from '@/lib/auth/guards'
import { applyStockChange } from '@/lib/repo/products'
import { consumeCoupon } from '@/lib/repo/coupons'
import { makeEvent, addOrderEvent } from '@/lib/repo/orders'
import { getRazorpay, toPaise, describeRazorpayError } from '@/lib/razorpayServer'
import { sendEmail } from '@/lib/sendEmail'

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`
const RANK = { processing: 0, pending: 1, processed: 2, failed: 2 } // refund states only move forward
const rank = (s) => (s in RANK ? RANK[s] : -1)

async function restockItems(conn, items) {
  for (const it of json(items, [])) {
    const qty = Number(it.returnQty ?? it.quantity)            // return items carry returnQty, order items quantity
    if (it.productId && qty > 0) await applyStockChange(conn, { productId: it.productId, variantId: it.variantId || null, qty, sale: false })
  }
}

// ───────────────────────────── payment confirmation ─────────────────────────────
export async function confirmRazorpayPayment({ razorpayOrderId, paymentId, userId = null, amountPaise = null }) {
  return tx(async (conn) => {
    const [[o]] = await conn.query(
      `SELECT * FROM orders WHERE razorpay_order_id = ?${userId ? ' AND user_id = ?' : ''} FOR UPDATE`,
      userId ? [razorpayOrderId, userId] : [razorpayOrderId])
    if (!o) return { found: false }

    if (amountPaise != null && Number(amountPaise) !== toPaise(o.total)) {
      console.error(`[payments] AMOUNT MISMATCH order=${o.id} razorpay_paid=${amountPaise} expected=${toPaise(o.total)} — NOT confirmed, check manually`)
      return { found: true, orderId: o.id, mismatch: true }
    }
    // A payment arriving after the order was auto-expired/cancelled is still REAL money → confirm it
    const lateButPaid = o.status === 'cancelled' && !o.razorpay_payment_id
    if (o.status !== 'pending' && !lateButPaid) return { found: true, orderId: o.id, changed: false } // already confirmed

    await addOrderEvent(conn, o.id,
      makeEvent('confirmed', lateButPaid ? 'Payment confirmed via Razorpay (received after the order had been cancelled)' : 'Payment confirmed via Razorpay'),
      { status: 'confirmed', razorpay_payment_id: paymentId })
    for (const l of json(o.items, [])) await applyStockChange(conn, { productId: l.productId, variantId: l.variantId, qty: l.quantity, sale: true })
    if (o.coupon_id) await consumeCoupon(conn, o.coupon_id) // money is captured: never fail the order over a coupon counter
    return { found: true, orderId: o.id, changed: true }
  })
}

// ───────────────────────────── returns: refund ─────────────────────────────
/** Mark an approved return refunded + restock. Idempotent (safe if the webhook and the admin click race). */
async function completeReturnRefund(conn, r, { mode, adminNote, reference = '', refund = null }) {
  if (r.status === 'refunded') return false
  const refundStatus = mode === 'manual' ? 'manual' : refund?.status === 'processed' ? 'processed' : 'pending'
  await conn.query(
    `UPDATE returns SET status = 'refunded', admin_note = ?, refund_status = ?, razorpay_refund_id = ?, refund_reference = ?, refund_error = NULL WHERE id = ?`,
    [adminNote == null ? (r.admin_note || '') : String(adminNote).slice(0, 2000), refundStatus, refund?.id || null, String(reference || '').slice(0, 100), r.id])
  await restockItems(conn, r.items)
  return true
}

export async function refundReturn({ returnId, adminNote = '', reference = '', razorpay = null }) {
  // 1 ─ validate + claim
  const claim = await tx(async (conn) => {
    const [[r]] = await conn.query('SELECT * FROM returns WHERE id = ? FOR UPDATE', [returnId])
    if (!r) throw new HttpError(404, 'Return not found')
    if (r.status === 'refunded') throw new HttpError(409, 'This return has already been refunded')
    if (r.status !== 'approved') throw new HttpError(409, `Cannot refund a ${r.status} return`)
    if (r.refund_status) throw new HttpError(409, r.refund_status === 'processing' ? 'A refund is already in progress for this return' : 'This return has already been refunded')
    const amount = Number(r.refund_amount)
    if (!(amount > 0)) throw new HttpError(400, 'The refund amount is zero')
    const [[o]] = await conn.query('SELECT id, total, payment_method, razorpay_payment_id FROM orders WHERE id = ?', [r.order_id])
    if (o && amount > Number(o.total) + 0.001) throw new HttpError(400, 'The refund amount is larger than the order total')

    const online = !!(o && o.payment_method === 'razorpay' && o.razorpay_payment_id)
    if (!online) { // COD (or no gateway payment): money is returned by you manually, we just record it
      await completeReturnRefund(conn, r, { mode: 'manual', adminNote, reference })
      return { done: true }
    }
    await conn.query("UPDATE returns SET refund_status = 'processing', refund_error = NULL WHERE id = ?", [returnId])
    return { done: false, paymentId: o.razorpay_payment_id, amount, orderId: o.id }
  })
  if (claim.done) return { mode: 'manual', refundStatus: 'manual' }

  // 2 ─ Razorpay (outside the transaction)
  let refund
  try {
    refund = await (razorpay || getRazorpay()).payments.refund(claim.paymentId, {
      amount: toPaise(claim.amount), speed: 'normal', receipt: `return_${returnId}`.slice(0, 40),
      notes: { return_id: returnId, order_id: claim.orderId },
    })
  } catch (err) {
    const msg = describeRazorpayError(err)
    console.error(`[payments] Razorpay refused refund for return ${returnId}: ${msg}`)
    await query("UPDATE returns SET refund_status = NULL, refund_error = ? WHERE id = ? AND refund_status = 'processing'", [msg.slice(0, 255), returnId])
    throw new HttpError(502, `Razorpay could not process the refund: ${msg}`)
  }

  // 3 ─ save
  try {
    await tx(async (conn) => {
      const [[r]] = await conn.query('SELECT * FROM returns WHERE id = ? FOR UPDATE', [returnId])
      await completeReturnRefund(conn, r, { mode: 'razorpay', adminNote, refund })
    })
  } catch (err) {
    console.error(`[payments] REFUND ${refund.id} WAS CREATED at Razorpay but saving return ${returnId} failed. The webhook will complete it. Do NOT refund again.`, err)
    throw new HttpError(500, 'The refund was sent to Razorpay but could not be saved here. It will sync automatically. Do not refund again.')
  }
  return { mode: 'razorpay', refundId: refund.id, refundStatus: refund.status === 'processed' ? 'processed' : 'pending' }
}

// ───────────────────────────── orders: cancel / status ─────────────────────────────
async function finishCancel(conn, o, { note, refund = null }) {
  // Stock was taken only for confirmed/processing orders. Pending took none; shipped parcels are in transit (handle by hand).
  const restock = ['confirmed', 'processing'].includes(o.status)
  if (restock) await restockItems(conn, o.items)
  const base = note || 'Your order has been cancelled.'
  const text = refund ? `${base} A refund of ${inr(o.total)} has been initiated to your original payment method.` : base
  await addOrderEvent(conn, o.id, makeEvent('cancelled', text), {
    status: 'cancelled',
    ...(refund ? { razorpay_refund_id: refund.id, refund_status: refund.status === 'processed' ? 'processed' : 'pending', refunded_amount: Number(o.total) } : {}),
  })
  return { restocked: restock }
}

export async function cancelOrder({ orderId, note = '', allowRefund = false, razorpay = null }) {
  const plan = await tx(async (conn) => {
    const [[o]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId])
    if (!o) throw new HttpError(404, 'Order not found')
    if (o.status === 'cancelled') return { done: true, already: true }
    if (o.status === 'delivered') throw new HttpError(409, 'A delivered order cannot be cancelled. Use the Returns flow instead.')
    if (o.refund_status === 'processing') throw new HttpError(409, 'A refund for this order is already in progress')

    const paid = o.payment_method === 'razorpay' && !!o.razorpay_payment_id
    if (paid && !allowRefund) {
      throw new HttpError(409, `This order was paid online (${inr(o.total)}). Cancelling it will refund ${inr(o.total)} to the customer through Razorpay. Continue?`, { needsRefundConfirm: true })
    }
    if (!paid) { // COD, or an online order that was never paid: nothing to refund
      const r = await finishCancel(conn, o, { note })
      return { done: true, refunded: false, restocked: r.restocked }
    }
    await conn.query("UPDATE orders SET refund_status = 'processing' WHERE id = ?", [orderId])
    return { done: false, paymentId: o.razorpay_payment_id, amount: Number(o.total) }
  })
  if (plan.done) return plan

  let refund
  try {
    refund = await (razorpay || getRazorpay()).payments.refund(plan.paymentId, {
      amount: toPaise(plan.amount), speed: 'normal', receipt: `cancel_${orderId}`.slice(0, 40), notes: { order_id: orderId },
    })
  } catch (err) {
    const msg = describeRazorpayError(err)
    console.error(`[payments] Razorpay refused refund for cancelled order ${orderId}: ${msg}`)
    await query("UPDATE orders SET refund_status = NULL WHERE id = ? AND refund_status = 'processing'", [orderId]) // order stays as it was
    throw new HttpError(502, `Razorpay could not process the refund, so the order was NOT cancelled: ${msg}`)
  }

  try {
    const r = await tx(async (conn) => {
      const [[o]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId])
      return finishCancel(conn, o, { note, refund })
    })
    return { done: true, refunded: true, restocked: r.restocked, refundId: refund.id }
  } catch (err) {
    console.error(`[payments] REFUND ${refund.id} WAS CREATED at Razorpay but cancelling order ${orderId} failed to save. The webhook will complete it. Do NOT refund again.`, err)
    throw new HttpError(500, 'The refund was sent to Razorpay but the cancellation could not be saved. It will sync automatically. Do not refund again.')
  }
}

/** Any status change except "cancelled". Returns false when the order doesn't exist. */
export async function setOrderStatus({ orderId, status, note }) {
  return tx(async (conn) => {
    const [[o]] = await conn.query('SELECT status, payment_method, razorpay_payment_id FROM orders WHERE id = ? FOR UPDATE', [orderId])
    if (!o) return false
    if (o.status === 'cancelled') throw new HttpError(409, "A cancelled order can't be reopened. Ask the customer to place a new order.")
    if (o.payment_method === 'razorpay' && !o.razorpay_payment_id && status !== 'pending') {
      throw new HttpError(409, 'This online order has not been paid yet, so it cannot be processed or shipped. Cancel it, or wait for the payment.')
    }
    return addOrderEvent(conn, orderId, makeEvent(status, note), { status })
  })
}

// ───────────────────────────── webhook ─────────────────────────────
async function alertAdmin(subject, html) {
  const to = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (to) await sendEmail({ to, subject, html }) // never throws
}

async function handleRefundEvent(eventName, entity) {
  const next = eventName === 'refund.processed' ? 'processed' : eventName === 'refund.failed' ? 'failed' : 'pending'
  const notes = entity.notes || {}

  // — a return refund?
  let [ret] = await query('SELECT * FROM returns WHERE razorpay_refund_id = ? LIMIT 1', [entity.id])
  if (!ret && notes.return_id) [ret] = await query('SELECT * FROM returns WHERE id = ? LIMIT 1', [notes.return_id])
  if (ret) {
    await tx(async (conn) => {
      const [[r]] = await conn.query('SELECT * FROM returns WHERE id = ? FOR UPDATE', [ret.id])
      if (r.refund_status === 'manual') return
      if (r.status === 'approved' && r.refund_status === 'processing') {
        await completeReturnRefund(conn, r, { mode: 'razorpay', refund: { ...entity, status: next === 'failed' ? 'pending' : next } }) // we crashed after Razorpay accepted it
      }
      if (rank(next) >= rank(r.refund_status)) {
        await conn.query('UPDATE returns SET refund_status = ?, razorpay_refund_id = COALESCE(razorpay_refund_id, ?) WHERE id = ?', [next, entity.id, r.id])
      }
    })
    if (next === 'failed') await alertAdmin('[Action needed] Razorpay refund FAILED', `<p>Refund <b>${entity.id}</b> for return <b>${ret.id}</b> (order ${ret.order_id}) failed at the bank/gateway. Please check the Razorpay dashboard and refund manually.</p>`)
    return { kind: 'return', id: ret.id, refundStatus: next }
  }

  // — an order-cancellation refund?
  let [ord] = await query('SELECT * FROM orders WHERE razorpay_refund_id = ? LIMIT 1', [entity.id])
  if (!ord && notes.order_id) [ord] = await query('SELECT * FROM orders WHERE id = ? LIMIT 1', [notes.order_id])
  if (ord) {
    await tx(async (conn) => {
      const [[o]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [ord.id])
      if (o.status !== 'cancelled' && o.refund_status === 'processing') {
        await finishCancel(conn, o, { note: '', refund: { ...entity, status: next === 'failed' ? 'pending' : next } }) // crash recovery
      } else if (rank(next) >= rank(o.refund_status)) {
        await conn.query('UPDATE orders SET refund_status = ?, razorpay_refund_id = COALESCE(razorpay_refund_id, ?) WHERE id = ?', [next, entity.id, o.id])
      }
    })
    if (next === 'failed') await alertAdmin('[Action needed] Razorpay refund FAILED', `<p>Refund <b>${entity.id}</b> for cancelled order <b>${ord.id}</b> failed. Please check the Razorpay dashboard and refund manually.</p>`)
    return { kind: 'order', id: ord.id, refundStatus: next }
  }
  console.warn(`[razorpay-webhook] refund ${entity.id} matches no return/order (probably created in the Razorpay dashboard): ignored`)
  return { kind: 'unknown' }
}

export async function handleRazorpayEvent(evt) {
  const name = evt?.event
  const payment = evt?.payload?.payment?.entity
  if (name === 'payment.captured' || name === 'order.paid') {
    const razorpayOrderId = payment?.order_id || evt?.payload?.order?.entity?.id
    if (!razorpayOrderId || !payment?.id) return { event: name, ignored: true }
    const r = await confirmRazorpayPayment({ razorpayOrderId, paymentId: payment.id, amountPaise: payment.amount })
    if (!r.found) { console.warn(`[razorpay-webhook] ${name}: no order for ${razorpayOrderId} (payment ${payment.id})`); return { event: name, notFound: true } }
    return { event: name, orderId: r.orderId, changed: !!r.changed, mismatch: !!r.mismatch }
  }
  if (typeof name === 'string' && name.startsWith('refund.')) {
    const entity = evt?.payload?.refund?.entity
    if (!entity?.id) return { event: name, ignored: true }
    return { event: name, ...(await handleRefundEvent(name, entity)) }
  }
  return { event: name || null, ignored: true } // payment.failed, payment.authorized, ... need no action
}