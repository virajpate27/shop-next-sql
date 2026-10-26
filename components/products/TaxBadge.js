// src/components/products/TaxBadge.js
import { formatTaxRate } from '@/utils/tax'

export function TaxBadge({ taxRate, taxType, className = '' }) {
  if (!taxRate || taxRate === 0) return null

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
        bg-blue-50 text-blue-700 border border-blue-100 ${className}`}
    >
      {formatTaxRate(taxRate)}
      <span className="text-blue-400 font-normal">
        {taxType === 'inclusive' ? 'incl.' : 'excl.'}
      </span>
    </span>
  )
}