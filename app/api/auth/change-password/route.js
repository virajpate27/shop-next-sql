import { NextResponse } from 'next/server'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { signSession, setSessionCookie } from '@/lib/auth/session'
import { rateLimit } from '@/lib/rateLimit'
import { changePassword } from '@/lib/repo/account'
import { passwordChangedEmail } from '@/lib/accountEmails'
import { sendEmail } from '@/lib/sendEmail'
import { one } from '@/lib/db'

// Logged-in password change. Every OTHER device is signed out (stolen-session protection);
// this device gets a fresh cookie so the person stays signed in.
export const POST = withAuth(async (req, _ctx, auth) => {
  if (!rateLimit(`pw:${auth.uid}`, { max: 5, windowMs: 15 * 60 * 1000 }).ok) {
    throw new HttpError(429, 'Too many attempts. Please try again in a few minutes.')
  }
  const { currentPassword, newPassword } = await req.json().catch(() => ({}))
  await changePassword({ userId: auth.uid, currentPassword, newPassword })

  const res = NextResponse.json({ ok: true })
  setSessionCookie(res, await signSession(auth.uid))

  // Security notice (best effort: a mail problem never undoes the change)
  const u = await one('SELECT display_name FROM users WHERE id = ?', [auth.uid])
  const mail = passwordChangedEmail({ name: u?.display_name })
  await sendEmail({ to: auth.email, subject: mail.subject, html: mail.html })
  return res
})