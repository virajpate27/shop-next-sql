import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { one, query, newId } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { signSession, setSessionCookie } from '@/lib/auth/session'
import { sendEmail } from '@/lib/sendEmail'
import { getEmailTemplate } from '@/emails/templates'

export async function POST(req) {
  const rl = rateLimit(`register:${clientIp(req)}`, { max: 5, windowMs: 60*60*1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  const { email, password, name } = await req.json().catch(() => ({}))
  const e = String(email || '').toLowerCase().trim()
  if (!/^\S+@\S+\.\S+$/.test(e)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  if (!password || password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  if (await one('SELECT id FROM users WHERE email = ?', [e])) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }
  const id = newId()
  await query(
    'INSERT INTO users (id, email, display_name, password_hash, role) VALUES (?,?,?,?,?)',
    [id, e, name?.trim() || null, await hashPassword(password), 'customer']
  )

  // Welcome email — fire and forget
  const t = getEmailTemplate('welcome', { displayName: name })
  if (t) sendEmail({ to: e, subject: t.subject, html: t.html }).catch(() => {})

  const res = NextResponse.json({ user: { uid: id, email: e, displayName: name || null, role: 'customer', wishlist: [] } })
  return setSessionCookie(res, await signSession(id))
}
