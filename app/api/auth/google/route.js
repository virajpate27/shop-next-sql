import { NextResponse } from 'next/server'
import { one, query, newId } from '@/lib/db'
import { signSession, setSessionCookie } from '@/lib/auth/session'
import { sendEmail } from '@/lib/sendEmail'
import { getEmailTemplate } from '@/emails/templates'

// Client obtains a Google OAuth access_token (popup) and posts it here.
// We verify it was issued for OUR client id, then read the profile.
export async function POST(req) {
  const { accessToken } = await req.json().catch(() => ({}))
  if (!accessToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`).then((r) => r.ok ? r.json() : null)
  if (!info || info.aud !== process.env.GOOGLE_CLIENT_ID) return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })
  const prof = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json())
  if (!prof.email || prof.email_verified === false) return NextResponse.json({ error: 'Google email not verified' }, { status: 401 })

  const email = prof.email.toLowerCase()
  let u = await one('SELECT * FROM users WHERE email=? OR google_sub=?', [email, prof.sub])
  if (u?.blocked) return NextResponse.json({ error: 'This account has been blocked' }, { status: 403 })
  if (!u) {
    const id = newId()
    await query('INSERT INTO users (id,email,display_name,photo_url,google_sub,role) VALUES (?,?,?,?,?,?)', [id, email, prof.name || null, prof.picture || null, prof.sub, 'customer'])
    u = { id, email, display_name: prof.name, role: 'customer' }
    const t = getEmailTemplate('welcome', { displayName: prof.name })
    if (t) sendEmail({ to: email, subject: t.subject, html: t.html }).catch(() => {})
  } else if (!u.google_sub) {
    await query('UPDATE users SET google_sub=?, photo_url=COALESCE(photo_url,?) WHERE id=?', [prof.sub, prof.picture || null, u.id])
  }
  const res = NextResponse.json({ user: { uid: u.id, email: u.email, displayName: u.display_name, role: u.role } })
  return setSessionCookie(res, await signSession(u.id))
}
