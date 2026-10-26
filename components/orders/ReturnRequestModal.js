// src/components/orders/ReturnRequestModal.js
'use client'
import { useState } from 'react'
import { X, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { createReturnRequest, RETURN_REASONS } from '@/lib/api/returns'
import { triggerEmail } from '@/lib/triggerEmail'

export function ReturnRequestModal({ order, onClose, onSuccess }) {
  const [selectedItems, setSelectedItems] = useState(
    order.items?.map((item) => ({ ...item, selected: false, returnQty: item.quantity })) || []
  )
  const [reason,     setReason]     = useState('')
  const [customNote, setCustomNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hasSelectedItems = selectedItems.some((i) => i.selected)

  function toggleItem(index) {
    setSelectedItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, selected: !item.selected } : item
      )
    )
  }

  function updateReturnQty(index, qty) {
    setSelectedItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, returnQty: Math.min(Math.max(1, qty), item.quantity) }
          : item
      )
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!hasSelectedItems) return toast.error('Select at least one item to return')
    if (!reason) return toast.error('Please select a reason')

    setSubmitting(true)
    try {
      const returnItems = selectedItems
        .filter((i) => i.selected)
        .map((i) => ({
          productId:    i.productId,
          variantId:    i.variantId || null,
          name:         i.name,
          image:        i.image,
          variantLabel: i.variantLabel || null,
          price:        i.price,
          quantity:     i.quantity,
          returnQty:    i.returnQty,
        }))

      const refundAmount = returnItems.reduce(
        (sum, i) => sum + i.price * i.returnQty, 0
      )

      const returnId = await createReturnRequest({
        orderId:       order.id,
        userId:        order.userId,
        customerEmail: order.customerEmail,
        items:         returnItems,
        reason,
        customNote:    customNote.trim(),
        refundAmount,
        paymentMethod: order.paymentMethod,
      })

      // Notify admin
      triggerEmail('admin_return_request', process.env.NEXT_PUBLIC_ADMIN_EMAIL, {
        returnId,
        orderId:   order.id,
        reason,
        items:     returnItems,
        refundAmount,
      })

      toast.success('Return request submitted successfully')
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit return request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">Request return / refund</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Select items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select items to return <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {selectedItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 border-2 rounded-xl transition-colors cursor-pointer ${
                    item.selected
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleItem(idx)}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(idx)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 accent-indigo-600 flex-shrink-0"
                  />

                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {item.name}
                    </p>
                    {item.variantLabel && (
                      <p className="text-xs text-indigo-600">{item.variantLabel}</p>
                    )}
                    <p className="text-xs text-gray-400">Qty ordered: {item.quantity}</p>
                  </div>

                  {/* Return quantity selector */}
                  {item.selected && item.quantity > 1 && (
                    <div
                      className="flex items-center gap-1.5 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs text-gray-500">Return qty:</span>
                      <input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={item.returnQty}
                        onChange={(e) => updateReturnQty(idx, Number(e.target.value))}
                        className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for return <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RETURN_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-left text-xs px-3 py-2.5 rounded-xl border transition-colors ${
                    reason === r
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Additional notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Additional details
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Describe the issue in more detail..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {customNote.length}/500
            </p>
          </div>

          {/* Refund estimate */}
          {hasSelectedItems && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-700 mb-1">
                Estimated refund amount
              </p>
              <p className="text-lg font-bold text-indigo-700">
                ₹{selectedItems
                  .filter((i) => i.selected)
                  .reduce((sum, i) => sum + i.price * i.returnQty, 0)
                  .toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-indigo-500 mt-0.5">
                {order.paymentMethod === 'cod'
                  ? 'Refund via bank transfer within 7–10 business days after approval'
                  : 'Refund to original payment method within 5–7 business days after approval'}
              </p>
            </div>
          )}

          {/* Notice */}
          <div className="flex items-start gap-2.5 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p>
              After submitting, our team will review your request within 24–48 hours.
              You will be notified by email once a decision is made.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !hasSelectedItems || !reason}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}