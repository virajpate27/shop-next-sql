// src/components/orders/ReturnStatusBadge.js
import { RotateCcw } from 'lucide-react'
import { RETURN_STATUSES } from '@/lib/api/returns'

const COLORS = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  red:   'bg-red-50   text-red-700   border-red-200',
  blue:  'bg-blue-50  text-blue-700  border-blue-200',
}

export function ReturnStatusBadge({ status }) {
  const cfg    = RETURN_STATUSES[status]
  if (!cfg) return null
  const colors = COLORS[cfg.color] || COLORS.amber

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${colors}`}>
      <RotateCcw className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}