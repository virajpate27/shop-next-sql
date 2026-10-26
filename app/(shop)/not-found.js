// src/app/(shop)/not-found.js
import Link from 'next/link'
import { Search } from 'lucide-react'

export const metadata = { title: 'Page not found' }

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <p className="text-8xl font-bold text-gray-100 mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-400 mb-8">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
        >
          <Search className="w-4 h-4" /> Browse products
        </Link>
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