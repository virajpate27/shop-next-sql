import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { one, query } from '@/lib/db'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { validateNewPassword, setPasswordAfterReset } from '@/lib/repo/account'

export async function POST(req) {
  const rl = rateLimit(`reset:${clientIp(req)}`, { max: 10 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  const { token, password } = await req.json().catch(() => ({}))
  const problem = validateNewPassword(password)
  if (!token || problem) return NextResponse.json({ error: problem || 'Invalid request' }, { status: 400 })

  const h = crypto.createHash('sha256').update(token).digest('hex')
  const r = await one('SELECT user_id FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()', [h])
  if (!r) return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 })

  // Claim the token atomically: two simultaneous requests can never both use the same link
  const claim = await query('UPDATE password_resets SET used_at=UTC_TIMESTAMP() WHERE token_hash=? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()', [h])
  if (!claim.affectedRows) return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 })

  await setPasswordAfterReset(r.user_id, password) // also signs out every existing session
  return NextResponse.json({ ok: true })
}