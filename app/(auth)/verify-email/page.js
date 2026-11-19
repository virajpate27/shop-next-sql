'use client'
// The page the verification email links to: /verify-email?token=…
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { confirmEmail } from '@/lib/auth/client'

function Content() {
  const token = useSearchParams().get('token')
  const [state, setState] = useState(token ? 'loading' : 'invalid')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return
    let alive = true
    confirmEmail(token)
      .then(() => { if (alive) { setState('ok'); window.dispatchEvent(new Event('auth:changed')) } }) // refresh the banner if signed in
      .catch((e) => { if (alive) { setState('invalid'); setMessage(e?.message || '') } })
    return () => { alive = false }
  }, [token])

  return (
    <div className="max-w-md mx-auto py-24 px-4 text-center">
      {state === 'loading' && <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />}
      {state === 'ok' && (
        <>
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email verified</h1>
          <p className="text-gray-500 mb-6">Thank you: your email address is confirmed.</p>
          <Link href="/" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700">Continue shopping</Link>
        </>
      )}
      {state === 'invalid' && (
        <>
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">This link doesn&apos;t work</h1>
          <p className="text-gray-500 mb-6">{message || 'It may have expired or already been used.'} Sign in and use the banner at the top of the page to get a new one.</p>
          <Link href="/login" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700">Sign in</Link>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return <Suspense fallback={null}><Content /></Suspense>
}