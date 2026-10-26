// src/hooks/useCoupon.js
'use client'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cartStore'
import { authFetch } from '@/lib/authFetch'

export function useCoupon() {
  const appliedCoupon  = useCartStore((s) => s.appliedCoupon)
  const couponDiscount = useCartStore((s) => s.couponDiscount)
  const setCoupon      = useCartStore((s) => s.setCoupon)
  const removeCoupon   = useCartStore((s) => s.removeCoupon)

  // Local input state only — not persisted (just the text field)
  const [code,    setCode]    = useState(appliedCoupon?.code || '')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const apply = useCallback(async (cartTotal) => {
    if (!code.trim()) {
      setError('Please enter a coupon code')
      return false
    }
    setLoading(true)
    setError('')

    try {
      const res = await authFetch('/api/coupons/validate', {
  method: 'POST',
  body:   JSON.stringify({ code: code.trim(), cartTotal }),
})
      const data = await res.json()

      if (!data.valid) {
        setError(data.error || 'Invalid coupon')
        return false
      }

      // Save to cart store — persists across pages and refresh
      setCoupon(data.coupon, data.discount)

      toast.success(
        data.coupon.discountType === 'free_shipping'
          ? 'Free shipping applied!'
          : data.coupon.discountType === 'percent'
          ? `${data.coupon.discountValue}% discount applied!`
          : `₹${data.discount} discount applied!`
      )
      return true
    } catch {
      setError('Could not validate coupon. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }, [code, setCoupon])

  const remove = useCallback(() => {
    removeCoupon()
    setCode('')
    setError('')
    toast.success('Coupon removed')
  }, [removeCoupon])

  const isFreeShipping = appliedCoupon?.discountType === 'free_shipping'

  return {
    code,           setCode,
    coupon:         appliedCoupon,
    discount:       couponDiscount,
    loading,        error,
    apply,          remove,
    isFreeShipping,
  }
}