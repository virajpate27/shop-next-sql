// src/app/(shop)/layout.js
'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useCartSync } from '@/hooks/useCartSync'

export default function ShopLayout({ children }) {
  useCartSync()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}