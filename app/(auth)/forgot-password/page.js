// src/app/(auth)/forgot-password/page.js
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { resetPassword } from '@/lib/auth/client'

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (err) {
      const messages = {
        'auth/user-not-found':  'No account found with this email address',
        'auth/invalid-email':   'Please enter a valid email address',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
      }
      setError(messages[err.code] || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <ShoppingBag className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">ShopNext</span>
          </div>
          <p className="text-gray-500 text-sm">Reset your password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {sent ? (
            // ── Success state ─────────────────────────────────────────
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-gray-500 text-sm mb-1">
                We sent a password reset link to
              </p>
              <p className="text-indigo-600 font-medium text-sm mb-6">
                {email}
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  try again
                </button>
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>

          ) : (
            // ── Input state ───────────────────────────────────────────
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Forgot your password?
                </h2>
                <p className="text-sm text-gray-500">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError('')
                      }}
                      placeholder="you@example.com"
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition ${
                        error
                          ? 'border-red-300 focus:ring-red-400'
                          : 'border-gray-200 focus:ring-indigo-500'
                      }`}
                      autoFocus
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-500 mt-1.5">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send reset link
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}