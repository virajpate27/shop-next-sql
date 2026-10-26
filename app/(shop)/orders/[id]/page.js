// src/app/(shop)/orders/[id]/page.js
'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import {
  CheckCircle2, Package, MapPin, CreditCard,
  Banknote, Loader2, ChevronLeft, Tag,RotateCcw,
} from 'lucide-react'
import { ReturnRequestModal } from '@/components/orders/ReturnRequestModal'
import { ReturnStatusBadge } from '@/components/orders/ReturnStatusBadge'
import { getReturnByOrderId, isReturnEligible, RETURN_STATUSES } from '@/lib/api/returns'

import { getOrderById } from '@/lib/api/orders'
import { OrderTimeline } from '@/components/orders/OrderTimeline'
import { getStatusConfig, STATUS_COLORS } from '@/utils/orderStatus'
import { formatPrice, formatDate } from '@/utils/formatters'
import { getOptimizedUrl } from '@/lib/cloudinary'

function OrderDetailContent() {
  const { id }         = useParams()
  const searchParams   = useSearchParams()
  const justPlaced     = searchParams.get('success') === 'true'

  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)

  const [showReturnModal, setShowReturnModal] = useState(false)
const [returnRequest,   setReturnRequest]   = useState(null)
const [returnLoading,   setReturnLoading]   = useState(false)


// Fetch existing return request for this order:
useEffect(() => {
  if (!order?.id) return
  setReturnLoading(true)
  getReturnByOrderId(order.id)
    .then(setReturnRequest)
    .finally(() => setReturnLoading(false))
}, [order?.id])

// Eligibility check:
const eligibility = order ? isReturnEligible(order) : { eligible: false }

  // ── Live status — poll every 8s while the tab is visible (replaces Firestore onSnapshot) ──
  useEffect(() => {
    if (!id) return
    let alive = true
    async function load() {
      try {
        const o = await getOrderById(id)
        if (alive) setOrder(o)
      } catch {
        if (alive) setOrder((prev) => prev) // keep last known order on transient errors
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const t = setInterval(() => { if (!document.hidden) load() }, 8000)
    return () => { alive = false; clearInterval(t) }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Order not found</h1>
        <Link href="/orders" className="text-indigo-600 font-medium hover:underline">
          View all orders
        </Link>
      </div>
    )
  }

  const statusCfg = getStatusConfig(order.status)
  const colors    = STATUS_COLORS[statusCfg.color]

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

      <Link
        href="/orders"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 w-fit"
      >
        <ChevronLeft className="w-4 h-4" /> All orders
      </Link>

      {/* Success banner */}
      {justPlaced && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-6 mb-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Order placed successfully!
          </h1>
          <p className="text-sm text-gray-500">
            {order.paymentMethod === 'cod'
              ? "We'll notify you when your order ships. Pay cash on delivery."
              : 'Your payment was confirmed. We\'ll keep you updated by email.'}
          </p>
        </div>
      )}

      {/* Order header */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Order ID</p>
            <p className="font-mono text-sm font-bold text-gray-900">
              #{order.id.slice(0, 12).toUpperCase()}
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${colors.bg} ${colors.text}`}>
            {statusCfg.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Placed on {formatDate(order.createdAt)}
        </p>
      </div>


      {/* Return / refund section */}
{order?.status === 'delivered' && (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <RotateCcw className="w-4 h-4 text-indigo-600" />
        <h2 className="font-semibold text-gray-900">Return & refund</h2>
      </div>

      {returnLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      ) : returnRequest ? (
        <ReturnStatusBadge status={returnRequest.status} />
      ) : eligibility.eligible ? (
        <button
          onClick={() => setShowReturnModal(true)}
          className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Request return
        </button>
      ) : null}
    </div>

    {/* Return request details */}
    {returnRequest && (
      <div className="mt-4 space-y-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Return request
            </p>
            <p className="text-xs text-gray-400">
              #{returnRequest.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <p className="text-sm text-gray-700 mb-1">
            <span className="font-medium">Reason:</span> {returnRequest.reason}
          </p>
          {returnRequest.customNote && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Note:</span> {returnRequest.customNote}
            </p>
          )}
          <p className="text-sm font-semibold text-indigo-600 mt-2">
            Refund amount: {formatPrice(returnRequest.refundAmount)}
          </p>
        </div>

        {/* Admin response */}
        {returnRequest.adminNote && (
          <div className={`rounded-xl p-4 ${
            returnRequest.status === 'approved'
              ? 'bg-green-50 border border-green-100'
              : 'bg-red-50 border border-red-100'
          }`}>
            <p className={`text-xs font-semibold mb-1 ${
              returnRequest.status === 'approved' ? 'text-green-700' : 'text-red-700'
            }`}>
              {returnRequest.status === 'approved' ? 'Approved ✓' : 'Rejected ✗'}
            </p>
            <p className={`text-sm ${
              returnRequest.status === 'approved' ? 'text-green-600' : 'text-red-600'
            }`}>
              {returnRequest.adminNote}
            </p>
          </div>
        )}
      </div>
    )}

    {/* Eligibility info */}
    {!returnRequest && (
      <div className="mt-3">
        {eligibility.eligible ? (
          <p className="text-xs text-green-600">
            ✓ Eligible for return · {eligibility.daysRemaining} day{eligibility.daysRemaining !== 1 ? 's' : ''} remaining in return window
          </p>
        ) : (
          <p className="text-xs text-gray-400">{eligibility.reason}</p>
        )}
      </div>
    )}
  </div>
)}

{/* Return modal */}
{showReturnModal && order && (
  <ReturnRequestModal
    order={order}
    onClose={() => setShowReturnModal(false)}
    onSuccess={() => {
      getReturnByOrderId(order.id).then(setReturnRequest)
    }}
  />
)}





      {/* ── Timeline ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" />
          Order tracking
        </h2>
        <OrderTimeline order={order} />
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" />
          {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
        </h2>
        <div className="space-y-4">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="relative w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                {item.image && (
                  <Image
                    src={getOptimizedUrl(item.image, { width: 128, height: 128 })}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                {item.variantLabel && (
                  <p className="text-xs text-indigo-600 mt-0.5">{item.variantLabel}</p>
                )}
                <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery address */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600" />
          Delivery address
        </h2>
        <p className="text-sm font-medium text-gray-900">{order.shippingAddress?.fullName}</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          {order.shippingAddress?.line1}
          {order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />
          {order.shippingAddress?.city}, {order.shippingAddress?.state} — {order.shippingAddress?.pincode}
        </p>
        <p className="text-sm text-gray-400 mt-1">{order.shippingAddress?.phone}</p>
      </div>

      {/* Payment summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          {order.paymentMethod === 'cod'
            ? <Banknote className="w-4 h-4 text-green-600" />
            : <CreditCard className="w-4 h-4 text-indigo-600" />}
          Payment summary
        </h2>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
          </div>

          {/* GST breakdown */}
          {order.taxBreakdown?.map((tb) => (
            <div key={tb.rate} className="flex justify-between text-sm">
              <span className="text-gray-500">GST {tb.rate}%</span>
              <span className="text-gray-900">{formatPrice(tb.taxAmount)}</span>
            </div>
          ))}

          {/* Coupon */}
          {order.couponCode && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                {order.couponCode}
              </span>
              <span className="text-green-600 font-medium">
                {order.couponType === 'free_shipping'
                  ? 'Free shipping'
                  : `−${formatPrice(order.discount)}`}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Shipping</span>
            <span className="text-gray-900">
              {order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}
            </span>
          </div>

          {order.codFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">COD fee</span>
              <span className="text-gray-900">{formatPrice(order.codFee)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-baseline py-3 border-t border-gray-100">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</span>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          {order.paymentMethod === 'cod'
            ? 'Payment due on delivery'
            : `Paid via Razorpay${order.razorpayPaymentId ? ` · ${order.razorpayPaymentId}` : ''}`}
        </p>

        {/* GST invoice breakdown */}
        {order.taxBreakdown?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              GST breakdown
            </p>
            {order.taxBreakdown.map((tb) => (
              <div key={tb.rate} className="space-y-1 mb-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Taxable value @ {tb.rate}%</span>
                  <span>{formatPrice(tb.baseAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>CGST @ {tb.rate / 2}%</span>
                  <span>{formatPrice(tb.cgst)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>SGST @ {tb.rate / 2}%</span>
                  <span>{formatPrice(tb.sgst)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-xs font-semibold text-gray-700 pt-1 border-t border-gray-100">
              <span>Total GST</span>
              <span>{formatPrice(order.totalTax)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  )
}