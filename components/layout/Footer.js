// src/components/layout/Footer.js
'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-6 h-6 text-indigo-400" />
              <span className="text-white font-bold text-lg">ShopNext</span>
            </div>
            <p className="text-sm leading-relaxed">
              Premium products delivered fast across India. Secure payments via
              Razorpay.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4 text-sm">Shop</h4>
            <ul className="space-y-2 text-sm">
              {['All Products', 'Electronics', 'Fashion', 'Home & Kitchen'].map(
                (item) => (
                  <li key={item}>
                    <Link
                      href="/products"
                      className="hover:text-white transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                )
              )}
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
                  <Link
                    href={href}
                    className="hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4 text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              {[
                'Help Center',
                'Returns & Refunds',
                'Track Order',
                'Contact Us',
              ].map((item) => (
                <li key={item}>
                  <Link href="#" className="hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs">
            © {new Date().getFullYear()} ShopNext. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs">
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
