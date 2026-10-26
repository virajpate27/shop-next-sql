// src/app/admin/layout.js
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Package, ShoppingBag, Tag, Truck, Ticket, LogOut ,RotateCcw,Users,} from 'lucide-react'

import { logout } from '@/lib/auth/client';

const NAV = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { href: '/admin/customers',  icon: Users,           label: 'Customers'  },
  { href: '/admin/returns',    icon: RotateCcw,       label: 'Returns'    },
  { href: '/admin/categories', icon: Tag, label: 'Categories' }, 
  
  { href: '/admin/shipping', icon: Truck,  label: 'Shipping'   },
  { href: '/admin/coupons',    icon: Ticket,          label: 'Coupons'    },
];

export default function AdminLayout({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace('/register');
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <Link href="/" className="text-lg font-bold text-gray-900">
            ShopNext{' '}
            <span className="text-indigo-600 text-sm font-medium">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-500 rounded-xl hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
