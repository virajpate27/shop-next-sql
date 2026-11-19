// components/profile/ChangePasswordForm.js — "Change password" card for the profile page
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Loader2 } from 'lucide-react'
import { changePassword } from '@/lib/auth/client'

const input = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (next.length < 8) return toast.error('New password must be at least 8 characters')
    if (next.length > 72) return toast.error('New password can be at most 72 characters')
    if (next !== confirm) return toast.error('The new passwords do not match')
    setBusy(true)
    try {
      await changePassword(current, next)
      toast.success('Password changed. You were signed out on your other devices.')
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      toast.error(err?.message || 'Could not change the password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
      <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-indigo-600" />
        Change password
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Signed in with Google and never set a password? Use “Forgot password” on the sign-in page to create one.
      </p>
      <form onSubmit={submit} className="space-y-3 max-w-md">
        <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className={input} />
        <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (8–72 characters)" className={input} />
        <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" className={input} />
        <button disabled={busy} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Update password
        </button>
      </form>
    </section>
  )
}