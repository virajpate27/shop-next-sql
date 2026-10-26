// src/utils/orderStatus.js

export const ORDER_STATUSES = [
  {
    key:         'pending',
    label:       'Order placed',
    description: 'Your order has been received and is awaiting confirmation.',
    icon:        'clock',
    color:       'yellow',
  },
  {
    key:         'confirmed',
    label:       'Order confirmed',
    description: 'Your payment is confirmed. We are preparing your order.',
    icon:        'check-circle',
    color:       'blue',
  },
  {
    key:         'processing',
    label:       'Processing',
    description: 'Your items are being packed and made ready for dispatch.',
    icon:        'package',
    color:       'purple',
  },
  {
    key:         'shipped',
    label:       'Shipped',
    description: 'Your order is on its way! Expected delivery in 3–5 business days.',
    icon:        'truck',
    color:       'amber',
  },
  {
    key:         'delivered',
    label:       'Delivered',
    description: 'Your order has been delivered successfully. Enjoy your purchase!',
    icon:        'check-badge',
    color:       'green',
  },
  {
    key:         'cancelled',
    label:       'Cancelled',
    description: 'Your order has been cancelled. Refund will be processed in 5–7 business days.',
    icon:        'x-circle',
    color:       'red',
  },
]

// Active flow — used to determine which steps to show in timeline
export const ACTIVE_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

export function getStatusConfig(key) {
  return ORDER_STATUSES.find((s) => s.key === key) || ORDER_STATUSES[0]
}

export function getStatusIndex(key) {
  return ACTIVE_FLOW.indexOf(key)
}

// Tailwind color maps — keeps JSX clean
export const STATUS_COLORS = {
  yellow: {
    bg:     'bg-yellow-50',
    text:   'text-yellow-700',
    border: 'border-yellow-200',
    dot:    'bg-yellow-400',
    ring:   'ring-yellow-200',
  },
  blue: {
    bg:     'bg-blue-50',
    text:   'text-blue-700',
    border: 'border-blue-200',
    dot:    'bg-blue-500',
    ring:   'ring-blue-200',
  },
  purple: {
    bg:     'bg-purple-50',
    text:   'text-purple-700',
    border: 'border-purple-200',
    dot:    'bg-purple-500',
    ring:   'ring-purple-200',
  },
  amber: {
    bg:     'bg-amber-50',
    text:   'text-amber-700',
    border: 'border-amber-200',
    dot:    'bg-amber-500',
    ring:   'ring-amber-200',
  },
  green: {
    bg:     'bg-green-50',
    text:   'text-green-700',
    border: 'border-green-200',
    dot:    'bg-green-500',
    ring:   'ring-green-200',
  },
  red: {
    bg:     'bg-red-50',
    text:   'text-red-700',
    border: 'border-red-200',
    dot:    'bg-red-500',
    ring:   'ring-red-200',
  },
}