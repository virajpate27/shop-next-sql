import { NextResponse } from 'next/server'
import { withAdmin, HttpError } from '@/lib/auth/guards'
import { updateTracking } from '@/lib/repo/payments'
import { cleanTracking } from '@/lib/tracking'

// Admin: add or correct courier / tracking number / link on an order that is shipped (or delivered).
export const PUT = withAdmin(async (req, { params }) => {
  const t = cleanTracking(await req.json().catch(() => ({})))
  if (t.error) throw new HttpError(400, t.error)
  if (t.empty) throw new HttpError(400, 'Enter a courier, tracking number or tracking link')
  const found = await updateTracking({ orderId: (await params).id, tracking: t.value })
  if (!found) throw new HttpError(404, 'Order not found')
  return NextResponse.json({ ok: true })
})