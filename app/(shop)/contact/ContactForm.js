
'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

const field = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function ContactForm({ supportEmail }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', orderId: '', message: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // Prefill for signed-in customers (only fills empty fields)
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.displayName || '', email: f.email || user.email || '' }))
  }, [user])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || 'Could not send your message. Please try again.'); return }
      setSent(true)
    } catch {
      toast.error(`Network problem. Please try again, or email ${supportEmail}.`)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="border border-green-100 bg-green-50 rounded-2xl p-6 text-green-800">
        <p className="font-semibold">Thank you: your message has been sent.</p>
        <p className="text-sm mt-1">We will reply to {form.email} as soon as we can.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* honeypot: real people never see or fill this; bots do */}
      <input name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden="true"
        className="absolute -left-[9999px] w-px h-px opacity-0" />
      <div className="grid gap-4 sm:grid-cols-2">
        <input className={field} placeholder="Your name *" required maxLength={100} value={form.name} onChange={set('name')} />
        <input className={field} type="email" placeholder="Email *" required maxLength={150} value={form.email} onChange={set('email')} />
        <input className={field} placeholder="Phone (optional)" maxLength={20} value={form.phone} onChange={set('phone')} />
        <input className={field} placeholder="Order number (optional)" maxLength={60} value={form.orderId} onChange={set('orderId')} />
      </div>
      <textarea className={field} rows={6} placeholder="How can we help? *" required minLength={10} maxLength={2000} value={form.message} onChange={set('message')} />
      <button disabled={busy} className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
        {busy ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}