import { NextResponse } from 'next/server'
import { tx } from '@/lib/db'
import { withAdmin, HttpError } from '@/lib/auth/guards'
import { refundReturn } from '@/lib/repo/payments'

// pending → approved | rejected      approved → refunded (real Razorpay refund for online orders)
const FLOW = { pending: ['approved', 'rejected'], approved: ['refunded'], rejected: [], refunded: [] }

export const PATCH = withAdmin(async (req, { params }) => {
  const { status, adminNote = '', reference = '' } = await req.json()
  const id = (await params).id

  if (status === 'refunded') {
    // Online order → money goes back through Razorpay; COD → recorded as a manual refund. Restocks exactly once.
    const r = await refundReturn({ returnId: id, adminNote, reference })
    return NextResponse.json({ ok: true, restocked: true, ...r })
  }

  if (!['approved', 'rejected'].includes(status)) throw new HttpError(400, 'Invalid status')
  await tx(async (conn) => {
    const [[r]] = await conn.query('SELECT status FROM returns WHERE id=? FOR UPDATE', [id])
    if (!r) throw new HttpError(404, 'Return not found')
    if (!FLOW[r.status]?.includes(status)) throw new HttpError(409, `Cannot change a ${r.status} return to ${status}`)
    await conn.query('UPDATE returns SET status=?, admin_note=?, resolved_at=? WHERE id=?', [status, String(adminNote).slice(0, 2000), new Date(), id])
  })
  return NextResponse.json({ ok: true, restocked: false })
})