// lib/razorpayServer.js — server-only Razorpay helpers
import Razorpay from 'razorpay'
import crypto from 'node:crypto'

/** Created on demand, so a missing key can never crash the build or an unrelated route. */
export const getRazorpay = () => new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })

/** Webhook authenticity: HMAC-SHA256 of the RAW request body with your webhook secret. Constant-time compare. */
export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected), b = Buffer.from(String(signature))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export const toPaise = (rupees) => Math.round(Number(rupees) * 100)

/** Readable message from a Razorpay SDK error (shown to the admin only, never to customers). */
export const describeRazorpayError = (err) => String(err?.error?.description || err?.message || 'Razorpay request failed')