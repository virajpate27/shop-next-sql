// src/app/(shop)/layout.js
'use client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useCartSync } from '@/hooks/useCartSync'
import { EmailVerifyBanner } from '@/components/layout/EmailVerifyBanner'

export default function ShopLayout({ children }) {
  useCartSync()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <EmailVerifyBanner />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}