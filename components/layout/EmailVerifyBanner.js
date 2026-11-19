// components/layout/EmailVerifyBanner.js — slim bar for signed-in customers whose email is not verified yet
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { MailWarning, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { sendVerificationEmail } from '@/lib/auth/client'

export function EmailVerifyBanner() {
  const { user } = useAuth()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [hidden, setHidden] = useState(false)

  // emailVerified is false only when the column exists AND the address is not verified yet
  if (!user || user.emailVerified !== false || hidden) return null

  async function resend() {
    setSending(true)
    try {
      await sendVerificationEmail()
      setSent(true)
      toast.success('Verification email sent. Please check your inbox (and spam folder).')
    } catch (err) {
      toast.error(err?.message || 'Could not send the email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-100 text-amber-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
        <MailWarning className="w-4 h-4 flex-shrink-0" />
        <p className="flex-1">
          Please verify your email address ({user.email}).{' '}
          {sent ? (
            <span className="font-medium">Email sent: check your inbox.</span>
          ) : (
            <button onClick={resend} disabled={sending} className="font-semibold underline underline-offset-2 disabled:opacity-60">
              {sending ? 'Sending…' : 'Send me the link'}
            </button>
          )}
        </p>
        <button onClick={() => setHidden(true)} className="p-1 hover:bg-amber-100 rounded" aria-label="Dismiss"><X className="w-4 h-4" /></button>
      </div>
    </div>
  )
}