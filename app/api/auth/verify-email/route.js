import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { verifyEmailToken } from '@/lib/repo/account'

// The link in the email lands on /verify-email?token=…, which calls this. Works on any device (the token is the proof).
export async function POST(req) {
  if (!rateLimit(`verify:${clientIp(req)}`, { max: 20, windowMs: 15 * 60 * 1000 }).ok) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }
  const { token } = await req.json().catch(() => ({}))
  const r = await verifyEmailToken(token)
  if (!r.ok) return NextResponse.json({ error: 'This link is invalid or has expired. Request a new one from your account.' }, { status: 400 })
  return NextResponse.json({ ok: true })
}