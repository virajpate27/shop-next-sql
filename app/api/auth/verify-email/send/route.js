import { NextResponse } from 'next/server'
import { one } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rateLimit'
import { createEmailVerification } from '@/lib/repo/account'
import { verificationEmail } from '@/lib/accountEmails'
import { sendEmail } from '@/lib/sendEmail'

// "Resend verification email" (banner / profile). 3 per hour per account.
export const POST = withAuth(async (_req, _ctx, auth) => {
  if (!rateLimit(`verify-send:${auth.uid}`, { max: 3, windowMs: 60 * 60 * 1000 }).ok) {
    throw new HttpError(429, 'We already sent several emails. Please check your inbox and spam folder, or try again later.')
  }
  let u
  try { u = await one('SELECT email, display_name, email_verified_at FROM users WHERE id = ?', [auth.uid]) }
  catch (e) { if (e?.code === 'ER_BAD_FIELD_ERROR') throw new HttpError(503, 'Email verification is not available yet.'); throw e }
  if (!u) throw new HttpError(401, 'User not found')
  if (u.email_verified_at) return NextResponse.json({ ok: true, already: true })

  const token = await createEmailVerification(auth.uid, u.email)
  const mail = verificationEmail({ name: u.display_name, link: `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}` })
  const sent = await sendEmail({ to: u.email, subject: mail.subject, html: mail.html })
  if (!sent.success) throw new HttpError(502, 'We could not send the email right now. Please try again later.')
  return NextResponse.json({ ok: true })
})