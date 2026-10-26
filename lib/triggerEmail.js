// src/lib/triggerEmail.js
import { authFetch } from '@/lib/authFetch'

export async function triggerEmail(type, to, data) {
  if (!to) return false
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const res = await authFetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      body:   JSON.stringify({ type, to, data }),
    })
    return res.ok
  } catch (err) {
    console.error(`Email trigger error [${type}]:`, err.message)
    return false
  }
}