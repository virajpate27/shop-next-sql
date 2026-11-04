// src/lib/sendEmail.js
import { getResend, FROM } from './resend'

export async function sendEmail({ to, subject, html, from, replyTo }) {
  try {
    const { data, error } = await getResend().emails.send({
      from: from || FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),   // lets you hit "Reply" and answer the customer directly
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Email send failed:', err)
    return { success: false, error: err.message }
  }
}