import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/razorpayServer'
import { handleRazorpayEvent } from '@/lib/repo/payments'

// Razorpay → us. Confirms orders even if the customer closed the tab after paying, and tracks refunds.
// Dashboard setup: Settings → Webhooks → URL https://<your-domain>/api/razorpay/webhook, secret = RAZORPAY_WEBHOOK_SECRET,
// events: payment.captured, order.paid, refund.created, refund.processed, refund.failed.
export const dynamic = 'force-dynamic'

export async function POST(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set: cannot verify events')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }
  const raw = await req.text() // the signature covers the RAW body: never re-serialise it before verifying
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'), secret)) {
    console.warn('[razorpay-webhook] rejected: bad signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let evt
  try { evt = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  try {
    const result = await handleRazorpayEvent(evt)
    return NextResponse.json({ ok: true, ...result })     // 2xx = "received"; Razorpay stops retrying
  } catch (err) {
    console.error('[razorpay-webhook] processing failed (Razorpay will retry):', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 }) // non-2xx → Razorpay retries for up to 24h
  }
}