import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import crypto from 'node:crypto'
import { one, query } from '@/lib/db'
import { sendEmail } from '@/lib/sendEmail'

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')

export async function POST(req) {
  const rl = rateLimit(`forgot:${clientIp(req)}`, { max: 5, windowMs: 60*60*1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  const { email } = await req.json().catch(() => ({}))
  const u = email && await one('SELECT id,email,display_name FROM users WHERE email=?', [String(email).toLowerCase().trim()])
  if (u) {
    const token = crypto.randomBytes(32).toString('hex')
    await query('INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))', [sha(token), u.id])
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
    await sendEmail({
      to: u.email, subject: 'Reset your ShopNext password',
      html: `<p>Hi ${u.display_name || 'there'},</p><p><a href="${link}">Click here to set a new password</a>. This link expires in 1 hour.</p><p>If you didn't ask for this, ignore this email.</p>`,
    })
  }
  // Same response whether or not the account exists (no user enumeration)
  return NextResponse.json({ ok: true })
}
