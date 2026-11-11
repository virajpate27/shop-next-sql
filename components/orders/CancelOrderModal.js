// components/orders/CancelOrderModal.js — customer self-service cancellation
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { cancelMyOrder } from '@/lib/api/orders'
import { CANCEL_REASONS } from '@/lib/orderCancel'
import { formatPrice } from '@/utils/formatters'
import { SITE } from '@/lib/siteConfig'

export function CancelOrderModal({ order, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const paidOnline = order.paymentMethod === 'razorpay' && !!order.razorpayPaymentId

  async function confirmCancel() {
    setBusy(true)
    try {
      const res = await cancelMyOrder(order.id, reason)
      toast.success(res.refunded ? 'Order cancelled. Your refund is on its way.' : 'Order cancelled.')
      onDone?.()
      onClose()
    } catch (err) {
      toast.error(err?.message || 'Could not cancel the order. Please try again.')
      onDone?.() // the order may have moved on (e.g. now being prepared): refresh what the page shows
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Cancel this order?</h3>
          <button onClick={onClose} disabled={busy} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            {paidOnline
              ? `You paid ${formatPrice(order.total)} online. The full amount will be refunded to your original payment method within ${SITE.refundDays}.`
              : order.paymentMethod === 'cod'
                ? 'You have not paid anything yet: this is Cash on Delivery.'
                : 'Your payment was not completed, so nothing has been charged.'}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Why are you cancelling? <span className="text-gray-400 font-normal">(optional)</span></label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select a reason</option>
              {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={busy} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Keep my order</button>
            <button onClick={confirmCancel} disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Yes, cancel order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}