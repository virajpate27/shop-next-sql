// src/components/cart/CouponInput.js
'use client'
import { Tag, X, Loader2 } from 'lucide-react'
import { formatPrice } from '@/utils/formatters'

export function CouponInput({
  code, setCode, coupon, discount,
  loading, error, onApply, onRemove,
  cartTotal, isFreeShipping,
}) {
  function handleKey(e) {
    if (e.key === 'Enter') onApply(cartTotal)
  }

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
        <Tag className="w-4 h-4 text-indigo-500" />
        Apply coupon
      </p>

      {coupon ? (
        // ── Applied state ──────────────────────────────────────────────
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-green-800 font-mono tracking-widest">
              {coupon.code}
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              {isFreeShipping
                ? 'Free shipping applied'
                : coupon.discountType === 'percent'
                ? `${coupon.discountValue}% off — saving ${formatPrice(discount)}`
                : `Flat ${formatPrice(discount)} off`}
            </p>
          </div>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition-colors"
            aria-label="Remove coupon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // ── Input state ────────────────────────────────────────────────
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder="Enter code (e.g. SAVE20)"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-widest"
            maxLength={20}
          />
          <button
            onClick={() => onApply(cartTotal)}
            disabled={loading || !code.trim()}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : 'Apply'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
          <X className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  )
}