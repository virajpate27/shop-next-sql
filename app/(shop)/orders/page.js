// src/app/(shop)/orders/page.js
'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, ChevronRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getMyOrders } from '@/lib/api/orders'
import {
  getStatusConfig, STATUS_COLORS,
  ACTIVE_FLOW, getStatusIndex,
} from '@/utils/orderStatus'
import { formatPrice, formatDate } from '@/utils/formatters'

function OrdersContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/orders')
  }, [user, authLoading, router])

  useEffect(() => {
    async function fetchOrders() {
      if (!user) return
      setLoading(true)
      try {
        const results = await getMyOrders()   // newest first (sorted by the API)
        setOrders(results)
      } catch (err) {
        console.error('Failed to load orders:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My orders</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-400 text-sm mb-6">
            When you place an order, it&apos;ll show up here.
          </p>
          <Link
            href="/products"
            className="inline-flex bg-indigo-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const cfg          = getStatusConfig(order.status)
            const colors       = STATUS_COLORS[cfg.color]
            const isCancelled  = order.status === 'cancelled'
            const currentIndex = getStatusIndex(order.status)

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} ·{' '}
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${colors.bg} ${colors.text}`}>
                      {cfg.label}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatPrice(order.total)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>

                {/* Mini progress bar */}
                {!isCancelled && (
                  <div className="flex items-center gap-1">
                    {ACTIVE_FLOW.map((key, idx) => {
                      const stepCfg = getStatusConfig(key)
                      const done    = idx <= currentIndex
                      return (
                        <div key={key} className="flex items-center gap-1 flex-1">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            done
                              ? STATUS_COLORS[stepCfg.color].dot
                              : 'bg-gray-200'
                          }`} />
                          {idx < ACTIVE_FLOW.length - 1 && (
                            <div className={`flex-1 h-0.5 ${idx < currentIndex ? 'bg-indigo-300' : 'bg-gray-100'}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {isCancelled && (
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
                    <div className="flex-1 h-0.5 bg-red-100" />
                    <p className="text-xs text-red-500 font-medium">Cancelled</p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}