// lib/accountEmails.js — small transactional emails for the account area (pure HTML builders)
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const shell = (body) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#374151;line-height:1.5">${body}</div>`

export function verificationEmail({ name, link }) {
  return {
    subject: 'Please verify your email address',
    html: shell(`<p>Hi ${esc(name || 'there')},</p>
      <p>Please confirm that this is your email address so we can reach you about your orders.</p>
      <p><a href="${esc(link)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Verify my email</a></p>
      <p style="font-size:13px;color:#6b7280">This link works for 24 hours. If you did not create an account, you can ignore this email.</p>`),
  }
}

export function passwordChangedEmail({ name }) {
  return {
    subject: 'Your password was changed',
    html: shell(`<p>Hi ${esc(name || 'there')},</p>
      <p>The password on your account was just changed, and you were signed out on your other devices.</p>
      <p style="font-size:13px;color:#6b7280"><b>If this was not you</b>, reset your password straight away using “Forgot password” on the sign-in page and contact us.</p>`),
  }
}