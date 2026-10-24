'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

function Form() {
  const token = useSearchParams().get('token')
  const router = useRouter()
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true)
    const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: pw }) })
    const data = await res.json(); setBusy(false)
    if (!res.ok) return toast.error(data.error || 'Failed')
    toast.success('Password updated — please sign in'); router.push('/login?reset=success')
  }
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto py-24 px-4 space-y-4">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <input type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min 8 chars)" className="w-full border rounded-xl px-4 py-3" />
      <button disabled={busy || !token} className="w-full bg-indigo-600 text-white rounded-xl py-3 disabled:opacity-50">{busy ? 'Saving…' : 'Update password'}</button>
    </form>
  )
}
export default function Page() { return <Suspense><Form /></Suspense> }
