// src/components/orders/OrderTimeline.js
import {
  Clock, CheckCircle2, Package, Truck,
  BadgeCheck, XCircle, MessageSquare,
} from 'lucide-react'
import {
  ACTIVE_FLOW, getStatusIndex, getStatusConfig, STATUS_COLORS,
} from '@/utils/orderStatus'

const ICONS = {
  'clock':       Clock,
  'check-circle': CheckCircle2,
  'package':     Package,
  'truck':       Truck,
  'check-badge': BadgeCheck,
  'x-circle':    XCircle,
}

function formatTimestamp(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return new Intl.DateTimeFormat('en-IN', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

export function OrderTimeline({ order }) {
  const isCancelled   = order.status === 'cancelled'
  const currentIndex  = getStatusIndex(order.status)
  const timeline      = order.timeline || []

  // Build a map of status → timeline event for quick lookup
  const eventMap = {}
  timeline.forEach((ev) => {
    // Keep the latest event per status
    if (!eventMap[ev.status] || ev.timestamp > eventMap[ev.status].timestamp) {
      eventMap[ev.status] = ev
    }
  })

  // Which steps to show
  const steps = isCancelled ? ACTIVE_FLOW : ACTIVE_FLOW

  return (
    <div>
      {/* ── Progress bar (only for non-cancelled) ────────────────── */}
      {!isCancelled && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {ACTIVE_FLOW.map((key, idx) => {
              const cfg      = getStatusConfig(key)
              const done     = idx <= currentIndex
              const colors   = STATUS_COLORS[done ? cfg.color : 'yellow']
              const isCurrent = idx === currentIndex

              return (
                <div
                  key={key}
                  className="flex flex-col items-center gap-1.5 flex-1"
                >
                  {/* Step dot */}
                  <div className={`relative w-8 h-8 rounded-full flex items-center justify-center
                    transition-all ${done
                      ? `${STATUS_COLORS[cfg.color].dot} ring-4 ${STATUS_COLORS[cfg.color].ring}`
                      : 'bg-gray-200'}`}
                  >
                    {done ? (
                      <svg className="w-4 h-4 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="w-2 h-2 bg-gray-400 rounded-full" />
                    )}
                    {/* Pulse animation on current step */}
                    {isCurrent && order.status !== 'delivered' && (
                      <span className={`absolute inset-0 rounded-full ${STATUS_COLORS[cfg.color].dot} opacity-30 animate-ping`} />
                    )}
                  </div>

                  {/* Label — hidden on mobile except current */}
                  <span className={`text-[10px] font-medium text-center leading-tight hidden sm:block ${
                    isCurrent ? `${STATUS_COLORS[cfg.color].text} font-semibold` : done ? 'text-gray-600' : 'text-gray-300'
                  }`}>
                    {cfg.label}
                  </span>
                </div>
              )
            }).reduce((acc, el, idx, arr) => {
              acc.push(el)
              if (idx < arr.length - 1) {
                acc.push(
                  <div
                    key={`line-${idx}`}
                    className={`flex-1 h-0.5 mb-5 transition-all ${
                      idx < currentIndex ? 'bg-indigo-500' : 'bg-gray-200'
                    }`}
                  />
                )
              }
              return acc
            }, [])}
          </div>
        </div>
      )}

      {/* ── Vertical timeline ─────────────────────────────────────── */}
      <div className="space-y-0">
        {steps.map((key, idx) => {
          const cfg       = getStatusConfig(key)
          const event     = eventMap[key]
          const isDone    = event != null
          const isCurrent = key === order.status && !isCancelled
          const colors    = STATUS_COLORS[cfg.color]
          const Icon      = ICONS[cfg.icon] || Clock
          const isLast    = idx === steps.length - 1

          // Skip future cancelled step if order isn't cancelled
          if (key === 'cancelled' && !isCancelled) return null
          // Skip normal steps after cancelled
          if (isCancelled && idx > 0 && key !== 'cancelled' && !isDone) return null

          return (
            <div key={key} className="flex gap-4">

              {/* Left — icon + connector line */}
              <div className="flex flex-col items-center">
                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                  isDone
                    ? `${colors.bg} ${colors.border}`
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <Icon className={`w-4.5 h-4.5 ${isDone ? colors.text : 'text-gray-300'}`} />
                  {isCurrent && order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <span className={`absolute inset-0 rounded-full ${colors.dot} opacity-20 animate-ping`} />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 my-1 min-h-[2rem] ${isDone ? 'bg-indigo-200' : 'bg-gray-100'}`} />
                )}
              </div>

              {/* Right — content */}
              <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className={`text-sm font-semibold ${isDone ? 'text-gray-900' : 'text-gray-300'}`}>
                      {cfg.label}
                      {isCurrent && (
                        <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                          Current
                        </span>
                      )}
                    </p>
                    <p className={`text-xs mt-0.5 leading-relaxed ${isDone ? 'text-gray-500' : 'text-gray-300'}`}>
                      {event?.note || cfg.description}
                    </p>
                  </div>
                  {event?.timestamp && (
                    <p className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Cancelled step shown separately at bottom */}
        {isCancelled && (
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 bg-red-50 border-red-200">
                <XCircle className="w-4.5 h-4.5 text-red-500" />
              </div>
            </div>
            <div className="flex-1 pb-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-red-600">
                    Cancelled
                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                      Current
                    </span>
                  </p>
                  <p className="text-xs mt-0.5 text-gray-500 leading-relaxed">
                    {eventMap['cancelled']?.note || 'Your order has been cancelled.'}
                  </p>
                </div>
                {eventMap['cancelled']?.timestamp && (
                  <p className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                    {formatTimestamp(eventMap['cancelled'].timestamp)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}