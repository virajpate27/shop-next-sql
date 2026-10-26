// src/app/layout.js
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], display: 'swap' })


export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'ShopNext — Premium Shopping',
    template: '%s | ShopNext',
  },
  description: 'Shop premium products online. Fast delivery across India. Pay via Razorpay or Cash on Delivery.',
  keywords: ['online shopping', 'ecommerce', 'India', 'Razorpay', 'COD'],
  authors: [{ name: 'ShopNext' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'ShopNext',
    title: 'ShopNext — Premium Shopping',
    description: 'Shop premium products online. Fast delivery across India.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShopNext — Premium Shopping',
    description: 'Shop premium products online. Fast delivery across India.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </AuthProvider>
      </body>
    </html>
  )
}