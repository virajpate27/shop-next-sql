// src/app/(shop)/error.js
'use client'
import { useEffect } from 'react'
import Link from 'next/link' 
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-5" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
      <p className="text-gray-400 mb-8">
        We hit an unexpected error. Please try again or go back home.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-white border border-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}