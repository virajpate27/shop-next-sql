// src/app/api/email/send/route.js
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { withAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rateLimit'
import { getEmailTemplate } from '@/emails/templates'

// Auth required — prevents public email sending abuse
export const POST = withAuth(async (req, _ctx, auth) => {
  try {
    if (!rateLimit(`email:${auth.uid}`, { max: 30, windowMs: 60 * 60 * 1000 }).ok) {
      return NextResponse.json({ error: 'Too many emails' }, { status: 429 })
    }
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { type, to, data } = body

    if (!type || !to) {
      return NextResponse.json({ error: 'Missing type or to' }, { status: 400 })
    }

    // Customers may only email themselves or the store admin; admins may email customers (status updates).
    const recipients = (Array.isArray(to) ? to : [to]).map((x) => String(x).toLowerCase())
    const adminEmail = String(process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase()
    const allowedForCustomer = new Set([String(auth.email).toLowerCase(), adminEmail])
    if (recipients.length > 3 || (auth.role !== 'admin' && !recipients.every((r) => allowedForCustomer.has(r)))) {
      return NextResponse.json({ error: 'Recipient not allowed' }, { status: 403 })
    }

    const template = getEmailTemplate(type, data)
    if (!template) {
      return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 })
    }

    const resend  = new Resend(apiKey)
    const { data: result, error } = await resend.emails.send({
      from:    process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to:      Array.isArray(to) ? to : [to],
      subject: template.subject,
      html:    template.html,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: result?.id })
  } catch (err) {
    console.error('[email/send]', err)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
})