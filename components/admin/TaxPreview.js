// src/components/admin/TaxPreview.js
import { calculateTax } from '@/utils/tax'
import { formatPrice } from '@/utils/formatters'

export function TaxPreview({ price, taxRate, taxType }) {
  const tax = calculateTax(price, taxRate, taxType, 1)

  return (
    <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Live tax preview
      </p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Listed price</span>
          <span className="font-medium text-gray-900">{formatPrice(price)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Base price (excl. tax)</span>
          <span className="text-gray-900">{formatPrice(tax.basePrice)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">GST {taxRate}%</span>
          <span className="text-gray-900">{formatPrice(tax.taxPerUnit)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2 mt-2">
          <span className="text-gray-900">Customer pays</span>
          <span className="text-indigo-600">{formatPrice(tax.totalPrice)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {taxType === 'inclusive'
            ? `₹${formatPrice(tax.taxPerUnit)} GST is extracted from ₹${formatPrice(price)}`
            : `₹${formatPrice(tax.taxPerUnit)} GST is added on top of ₹${formatPrice(price)}`}
        </p>
      </div>
    </div>
  )
}