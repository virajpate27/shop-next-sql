// src/app/(shop)/wishlist/page.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getProductById } from '@/lib/api/products'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ProductGridSkeleton } from '@/components/products/ProductSkeleton'

export default function WishlistPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/wishlist')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function fetchWishlistProducts() {
      if (!profile?.wishlist?.length) {
        setProducts([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const results = await Promise.all(
          profile.wishlist.map((id) => getProductById(id))
        )
        setProducts(results.filter(Boolean)) // remove any deleted products
      } catch (err) {
        console.error('Failed to load wishlist:', err)
      } finally {
        setLoading(false)
      }
    }

    if (profile) fetchWishlistProducts()
  }, [profile])

  if (authLoading || !user) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">My wishlist</h1>
      </div>

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Your wishlist is empty</h3>
          <p className="text-gray-400 text-sm">Tap the heart icon on any product to save it here.</p>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  )
}