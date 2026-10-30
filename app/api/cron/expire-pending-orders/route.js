import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { query, tx } from '@/lib/db'
import { expireStalePendingOrders } from '@/lib/repo/orders'

// Daily cron: GET /api/cron/expire-pending-orders with header  x-cron-secret: <CRON_SECRET>
// Cancels unpaid Razorpay orders older than 24h (nothing was charged, no stock was taken).
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const given = req.headers.get('x-cron-secret') || ''
  const want = process.env.CRON_SECRET || ''
  const a = Buffer.from(given), b = Buffer.from(want)
  if (!want || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json({ success: true, ...(await expireStalePendingOrders(tx, query)) })
  } catch (e) {
    console.error('[cron/expire-pending-orders]', e)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}