import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { sendEmail } from '@/lib/sendEmail'

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const oneLine = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) // no header injection via line breaks

// Public contact form → email to the store owner (Reply-To = the customer).
export async function POST(req) {
  if (!rateLimit(`contact:${clientIp(req)}`, { max: 5, windowMs: 60 * 60 * 1000 }).ok) {
    return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 })
  }
  const b = await req.json().catch(() => ({}))
  if (b.website) return NextResponse.json({ ok: true }) // honeypot filled → a bot; pretend success, send nothing

  const name = oneLine(b.name, 100), email = oneLine(b.email, 150), phone = oneLine(b.phone, 20), orderId = oneLine(b.orderId, 60)
  const message = String(b.message ?? '').trim().slice(0, 2000)
  if (name.length < 2) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (message.length < 10) return NextResponse.json({ error: 'Please write a little more (at least 10 characters).' }, { status: 400 })

  const to = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (!to) {
    console.error('[contact] ADMIN_EMAIL is not set: message could not be delivered')
    return NextResponse.json({ error: 'Messages are temporarily unavailable. Please email us directly.' }, { status: 503 })
  }

  const sent = await sendEmail({
    to,
    replyTo: email,
    subject: `[Contact form] ${name}${orderId ? ` · order ${orderId}` : ''}`.slice(0, 150),
    html: `<h3>New message from the website</h3>
      <p><b>Name:</b> ${esc(name)}<br/><b>Email:</b> ${esc(email)}<br/><b>Phone:</b> ${esc(phone) || '—'}<br/><b>Order:</b> ${esc(orderId) || '—'}</p>
      <p style="white-space:pre-wrap">${esc(message)}</p>`,
  })
  if (!sent.success) return NextResponse.json({ error: 'We could not send your message right now. Please email us directly.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}