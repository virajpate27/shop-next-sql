// src/app/(shop)/cart/page.js
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useShipping } from '@/hooks/useShipping'
import { useCoupon } from '@/hooks/useCoupon'
import { CouponInput } from '@/components/cart/CouponInput'
import { calculateCartTax, getTaxBreakdown } from '@/utils/tax'
import { formatPrice } from '@/utils/formatters'
import { getOptimizedUrl } from '@/lib/cloudinary'

export default function CartPage() {
  const items          = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem     = useCartStore((s) => s.removeItem)
  const clearCart      = useCartStore((s) => s.clearCart)

  // ── Tax ────────────────────────────────────────────────────────────────
  const { subtotalBeforeTax, totalTaxAmount, totalAmount } = calculateCartTax(items)
  const taxBreakdown = getTaxBreakdown(items)
  const safeCartTotal = isNaN(totalAmount)
    ? items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0)
    : totalAmount

  // ── Coupon (reads from persisted cart store) ───────────────────────────
  const {
    code, setCode, coupon, discount,
    loading: couponLoading, error: couponError,
    apply: applyCoupon, remove: removeCoupon,
    isFreeShipping,
  } = useCoupon()

  // ── Shipping ───────────────────────────────────────────────────────────
  const { getShipping, config: shippingConfig, loading: shippingLoading } = useShipping()
  const { shippingCharge, shippingFree } = getShipping(safeCartTotal, 'razorpay', items)
  const effectiveShippingFree   = shippingFree || isFreeShipping
  const effectiveShippingCharge = effectiveShippingFree ? 0 : shippingCharge

  // ── Grand total ────────────────────────────────────────────────────────
  const grandTotal = Math.max(0, safeCartTotal - discount + effectiveShippingCharge)

  // ── Empty state ────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
        <ShoppingBag className="w-20 h-20 text-gray-200 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-gray-400 mb-8">Looks like you haven&apos;t added anything yet.</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          Start shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Shopping cart{' '}
          <span className="text-gray-400 font-normal text-lg">({items.length})</span>
        </h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
        >
          Clear cart
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* ── Items ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1)
            return (
              <div
                key={`${item.productId}__${item.variantId || 'base'}`}
                className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition-colors"
              >
                <Link
                  href={`/products/${item.slug || item.productId}`}
                  className="relative w-24 h-24 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0"
                >
                  {item.image ? (
                    <Image
                      src={getOptimizedUrl(item.image, { width: 200, height: 200 })}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 line-clamp-1 mb-0.5">
                      {item.name}
                    </h3>
                    {item.variantLabel && (
                      <p className="text-xs text-indigo-600 font-medium mb-0.5">
                        {item.variantLabel}
                      </p>
                    )}
                    <p className="text-sm text-gray-400">{formatPrice(item.price)} each</p>
                    {item.taxRate > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 mt-1">
                        GST {item.taxRate}%{' '}
                        <span className="text-blue-400 font-normal">
                          {item.taxType === 'exclusive' ? 'excl.' : 'incl.'}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                        className="p-2 hover:bg-gray-50 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                        disabled={item.quantity >= item.stock}
                        className="p-2 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        {formatPrice(lineTotal)}
                      </span>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Order summary ──────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Coupon input */}
          <CouponInput
            code={code}
            setCode={setCode}
            coupon={coupon}
            discount={discount}
            loading={couponLoading}
            error={couponError}
            onApply={applyCoupon}
            onRemove={removeCoupon}
            cartTotal={safeCartTotal}
            isFreeShipping={isFreeShipping}
          />

          {/* Summary card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-5">Order summary</h2>

            <div className="space-y-3 mb-5">
              {/* Subtotal */}
              {totalTaxAmount > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal (before tax)</span>
                  <span className="text-gray-900">{formatPrice(subtotalBeforeTax)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">{formatPrice(safeCartTotal)}</span>
                </div>
              )}

              {/* GST lines */}
              {taxBreakdown.map((tb) => (
                <div key={tb.rate} className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> GST {tb.rate}%
                  </span>
                  <span className="text-gray-900">{formatPrice(tb.taxAmount)}</span>
                </div>
              ))}

              {/* Coupon discount */}
              {coupon && discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 flex items-center gap-1.5">
                    <Tag className="w-3 h-3" />
                    {coupon.code}
                  </span>
                  <span className="text-green-600 font-semibold">
                    −{formatPrice(discount)}
                  </span>
                </div>
              )}

              {/* Free shipping coupon line */}
              {coupon && isFreeShipping && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 flex items-center gap-1.5">
                    <Tag className="w-3 h-3" /> {coupon.code}
                  </span>
                  <span className="text-green-600 font-semibold">Free shipping</span>
                </div>
              )}

              {/* Shipping */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="font-medium">
                  {shippingLoading ? (
                    <span className="text-gray-300">—</span>
                  ) : effectiveShippingFree ? (
                    <span className="text-green-600 font-semibold">Free</span>
                  ) : (
                    formatPrice(effectiveShippingCharge)
                  )}
                </span>
              </div>

              {/* Free shipping nudge */}
              {!shippingLoading &&
                !effectiveShippingFree &&
                shippingConfig.freeShippingEnabled &&
                shippingConfig.freeAbove > 0 &&
                safeCartTotal < shippingConfig.freeAbove && (
                  <div className="bg-indigo-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-indigo-700 font-medium">
                      Add{' '}
                      <span className="font-bold">
                        {formatPrice(shippingConfig.freeAbove - safeCartTotal)}
                      </span>{' '}
                      more for free shipping
                    </p>
                    <div className="mt-1.5 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (safeCartTotal / shippingConfig.freeAbove) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline py-4 border-t border-gray-100 mb-5">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(grandTotal)}
              </span>
            </div>

            {totalTaxAmount > 0 && (
              <p className="text-xs text-gray-400 mb-4">
                Includes {formatPrice(totalTaxAmount)} GST
              </p>
            )}

            <Link
              href="/checkout"
              className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors mb-3"
            >
              Proceed to checkout
            </Link>
            <Link
              href="/products"
              className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}