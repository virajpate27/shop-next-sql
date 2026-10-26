// src/components/layout/Navbar.js
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useCategories } from '@/hooks/useCategories'
import { useRouter } from 'next/navigation'
import { ShoppingBag, ShoppingCart, User, Search, Menu, X, Heart, LogOut, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useCartStore } from '@/store/cartStore'
import { logout } from '@/lib/auth/client'
import dynamic from 'next/dynamic'
const CartDrawer = dynamic(
  () => import('@/components/cart/CartDrawer').then((m) => m.CartDrawer),
  { ssr: false }
)


export default function Navbar() {
  const { user, profile, isAdmin } = useAuth()
  const itemCount = useCartStore((s) => s.getItemCount())
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const { categories } = useCategories()

  async function handleLogout() {
    await logout()
    toast.success('Signed out')
    router.push('/')
    setUserMenuOpen(false)
  }

  function handleSearch(e) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            <Link href="/" className="flex items-center gap-2">
              <ShoppingBag className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">ShopNext</span>
            </Link>

            <nav className="hidden md:flex items-center gap-7">
              <Link href="/products" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors font-medium">
                Products
              </Link>
              {categories.slice(0, 4).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/products?category=${cat.slug}`}
                  className="text-sm text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">

              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Cart trigger — opens drawer instead of navigating */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                        {(profile?.displayName || user.email)?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-lg z-20 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-50">
                          <p className="text-sm font-medium text-gray-900 truncate">{profile?.displayName || 'User'}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                          <Link
                            href="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <ShoppingBag className="w-4 h-4" /> My orders
                          </Link>
                          <Link
                            href="/wishlist"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Heart className="w-4 h-4" /> Wishlist
                          </Link>
                          <Link
                            href="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Settings className="w-4 h-4" /> Account settings
                          </Link>
                          {isAdmin && (
                            <Link
                              href="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Settings className="w-4 h-4" /> Admin panel
                            </Link>
                          )}
                          <div className="border-t border-gray-50 mt-1">
                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <LogOut className="w-4 h-4" /> Sign out
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Sign in
                </Link>
              )}

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="py-3 border-t border-gray-50">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </form>
            </div>
          )}

          {menuOpen && (
            <nav className="md:hidden py-4 border-t border-gray-50 space-y-1">
              <Link
                href="/products"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
              >
                All Products
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/products?category=${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  {cat.emoji} {cat.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}