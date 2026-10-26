import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { sendLowStockAlert } from '@/lib/lowStock'

// Cron entry point: GET /api/email/low-stock?secret=<CRON_SECRET>  (or header x-cron-secret)
export async function GET(req) {
  const given = new URL(req.url).searchParams.get('secret') || req.headers.get('x-cron-secret') || ''
  const want = process.env.CRON_SECRET || ''
  const a = Buffer.from(given), b = Buffer.from(want)
  if (!want || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { return NextResponse.json(await sendLowStockAlert()) }
  catch (e) { console.error('[low-stock]', e); return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
