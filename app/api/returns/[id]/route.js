import { NextResponse } from 'next/server'
import { tx, json } from '@/lib/db'
import { withAdmin, HttpError } from '@/lib/auth/guards'
import { applyStockChange } from '@/lib/repo/products'

const FLOW = { pending: ['approved', 'rejected'], approved: ['refunded'], rejected: [], refunded: [] }

// Admin: approve / reject / mark refunded. Refund restocks inventory in the SAME transaction,
// using the items stored on the return (never client-supplied), and can only happen once.
export const PATCH = withAdmin(async (req, { params }) => {
  const { status, adminNote = '' } = await req.json()
  const id = (await params).id
  const restocked = await tx(async (conn) => {
    const [[r]] = await conn.query('SELECT * FROM returns WHERE id=? FOR UPDATE', [id])
    if (!r) throw new HttpError(404, 'Return not found')
    if (!FLOW[r.status]?.includes(status)) throw new HttpError(409, `Cannot change a ${r.status} return to ${status}`)
    await conn.query('UPDATE returns SET status=?, admin_note=?, resolved_at=? WHERE id=?',
      [status, String(adminNote).slice(0, 2000), status === 'approved' || status === 'rejected' ? new Date() : null, id])
    if (status !== 'refunded') return false
    for (const it of json(r.items, [])) {
      if (it.productId && it.returnQty) await applyStockChange(conn, { productId: it.productId, variantId: it.variantId || null, qty: it.returnQty, sale: false })
    }
    return true
  })
  return NextResponse.json({ ok: true, restocked })
})
