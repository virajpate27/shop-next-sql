// src/components/layout/Footer.js
'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { SITE } from '@/lib/siteConfig';

const LINK = 'hover:text-white transition-colors';

export default function Footer() {
  const { categories } = useCategories();
  // real categories from the database (first 4); "All Products" is always first
  const shopLinks = [
    { label: 'All Products', href: '/products' },
    ...categories.slice(0, 4).map((c) => ({ label: c.name, href: `/products?category=${encodeURIComponent(c.slug)}` })),
  ];

  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-6 h-6 text-indigo-400" />
              <span className="text-white font-bold text-lg">{SITE.name}</span>
            </div>
            <p className="text-sm leading-relaxed">
              Premium products delivered fast across India. Secure payments via
              Razorpay.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4 text-sm">Shop</h4>
            <ul className="space-y-2 text-sm">
              {shopLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className={LINK}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4 text-sm">Account</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'My Orders', href: '/orders' },
                { label: 'Wishlist', href: '/wishlist' },
                { label: 'Profile', href: '/profile' },
                { label: 'Sign In', href: '/login' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className={LINK}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4 text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Help Center', href: '/help' },
                { label: 'Returns & Refunds', href: '/returns-policy' },
                { label: 'Track Order', href: '/orders' },
                { label: 'Shipping Policy', href: '/shipping-policy' },
                { label: 'Contact Us', href: '/contact' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className={LINK}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="text-xs text-center lg:text-left">
            <p>© {new Date().getFullYear()} {SITE.legalName.startsWith('EDIT') ? SITE.name : SITE.legalName}. All rights reserved.</p>
            {SITE.gstin && <p className="mt-1">GSTIN: {SITE.gstin}</p>}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            <Link href="/terms" className={LINK}>Terms</Link>
            <Link href="/privacy" className={LINK}>Privacy</Link>
            <Link href="/shipping-policy" className={LINK}>Shipping</Link>
            <Link href="/returns-policy" className={LINK}>Returns</Link>
            <span className="flex items-center gap-1.5">
              <img
                src="https://cdn.razorpay.com/static/assets/logo/payment.svg"
                alt="Razorpay"
                className="h-5 opacity-60"
              />
              Secured by Razorpay
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}