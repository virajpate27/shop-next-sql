// components/print/PackingSlipDocument.js — A4 packing slip for the person packing the parcel (no prices)
const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Big red warning when the parcel must NOT go out. */
export function packingWarning(order) {
  if (order.status === 'cancelled') return 'CANCELLED — DO NOT SHIP'
  if (order.paymentMethod === 'razorpay' && !order.razorpayPaymentId) return 'NOT PAID — DO NOT SHIP'
  if (order.status === 'pending') return 'NOT CONFIRMED — DO NOT SHIP'
  return ''
}

export default function PackingSlipDocument({ order, site }) {
  const a = order.shippingAddress || {}
  const isCod = order.paymentMethod === 'cod'
  const warning = packingWarning(order)
  const units = (order.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0)

  return (
    <div className="p-8 text-[13px] leading-snug text-gray-900">
      <div className="flex items-start justify-between pb-3 border-b-2 border-gray-900">
        <div>
          <p className="text-3xl font-black tracking-wide">PACKING SLIP</p>
          <p className="text-gray-600 mt-1">{site.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Order</p>
          <p className="text-2xl font-mono font-bold">#{String(order.id).slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
        </div>
      </div>

      {warning && <div className="mt-4 border-4 border-red-600 text-red-700 text-center text-2xl font-black py-3">{warning}</div>}

      <div className={`mt-4 text-center py-3 text-xl font-black border-2 ${isCod ? 'border-gray-900 bg-gray-900 text-white' : 'border-green-700 text-green-800'}`}>
        {isCod ? `CASH ON DELIVERY — COLLECT ${inr(order.total)}` : 'PREPAID — DO NOT COLLECT ANY MONEY'}
      </div>

      <div className="grid grid-cols-5 gap-6 mt-5">
        <div className="col-span-3">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Ship to</p>
          <p className="text-xl font-bold">{a.fullName}</p>
          <p className="text-base mt-1">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
          <p className="text-base">{a.city}, {a.state}</p>
          <p className="text-2xl font-black tracking-wider mt-1">PIN {a.pincode}</p>
          {a.phone && <p className="text-lg font-bold mt-1">☎ {a.phone}</p>}
        </div>
        <div className="col-span-2 text-xs text-gray-600">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">From</p>
          <p className="font-semibold text-gray-900">{site.legalName}</p>
          <p>{(site.address || []).join(', ')}</p>
          {site.phone && <p>{site.phone}</p>}
          {(order.courierName || order.trackingNumber) && (
            <div className="mt-3 border border-gray-300 p-2">
              <p className="text-[10px] uppercase font-semibold text-gray-500">Courier</p>
              <p className="font-semibold text-gray-900">{order.courierName || '—'}</p>
              {order.trackingNumber && <p className="font-mono">{order.trackingNumber}</p>}
            </div>
          )}
        </div>
      </div>

      <table className="w-full border-collapse mt-6 text-sm">
        <thead>
          <tr className="bg-gray-100 text-[10px] uppercase tracking-wide text-gray-600">
            <th className="px-2 py-2 text-left w-10">Packed</th>
            <th className="px-2 py-2 text-left">Item</th>
            <th className="px-2 py-2 text-right w-20">Qty</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map((it, i) => (
            <tr key={i} className="border-b border-gray-300">
              <td className="px-2 py-3 align-top"><span className="inline-block w-5 h-5 border-2 border-gray-700" /></td>
              <td className="px-2 py-3 align-top">
                <span className="font-semibold">{it.name}</span>
                {it.variantLabel && <span className="block text-base font-bold text-indigo-700">{it.variantLabel}</span>}
              </td>
              <td className="px-2 py-3 text-right align-top text-2xl font-black">{it.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-right text-sm mt-2 font-semibold">Total units: {units}</p>

      <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-gray-500">
        <div className="border-t border-gray-400 pt-1">Packed by</div>
        <div className="border-t border-gray-400 pt-1">Checked by</div>
      </div>
    </div>
  )
}