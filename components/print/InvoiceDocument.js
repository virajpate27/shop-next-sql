// components/print/InvoiceDocument.js — A4 invoice (presentational: no hooks, safe to render anywhere)
import { buildInvoice } from '@/lib/invoice'

const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const th = 'px-2 py-1.5 text-left font-semibold text-[10px] uppercase tracking-wide text-gray-600 border-b border-gray-300'
const td = 'px-2 py-1.5 align-top border-b border-gray-100'

export default function InvoiceDocument({ order, site }) {
  const inv = buildInvoice(order, site)
  const a = order.shippingAddress || {}
  const inter = inv.gst.mode === 'inter'
  const isCod = order.paymentMethod === 'cod'

  return (
    <div className="p-8 text-[12px] leading-snug text-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 pb-4 border-b-2 border-gray-800">
        <div>
          <p className="text-2xl font-bold text-gray-900">{site.name}</p>
          <p className="font-medium mt-0.5">{site.legalName}</p>
          <p className="text-gray-600 mt-1">{(site.address || []).join(', ')}</p>
          {site.gstin && <p className="text-gray-600">GSTIN: <span className="font-mono">{site.gstin}</span></p>}
          <p className="text-gray-600">{site.email}{site.phone ? ` · ${site.phone}` : ''}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-wide text-gray-900">INVOICE</p>
          <p className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${inv.paid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {inv.paid ? 'PAID' : isCod ? 'PAYMENT DUE ON DELIVERY' : 'PAYMENT PENDING'}
          </p>
        </div>
      </div>

      {/* Meta + customer */}
      <div className="grid grid-cols-2 gap-6 py-4">
        <div className="space-y-1">
          <p><span className="text-gray-500">Invoice no.:</span> <span className="font-mono font-semibold">{inv.number}</span></p>
          <p><span className="text-gray-500">Invoice date:</span> {inv.date}</p>
          <p><span className="text-gray-500">Order no.:</span> <span className="font-mono">#{String(order.id).slice(0, 12).toUpperCase()}</span></p>
          <p><span className="text-gray-500">Payment:</span> {isCod ? 'Cash on Delivery' : `Online (Razorpay)${order.razorpayPaymentId ? ` · ${order.razorpayPaymentId}` : ''}`}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wide font-semibold mb-1">Billed &amp; shipped to</p>
          <p className="font-semibold text-gray-900">{a.fullName}</p>
          <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
          <p>{a.city}, {a.state} – {a.pincode}</p>
          {a.phone && <p>Phone: {a.phone}</p>}
          {order.customerEmail && <p>{order.customerEmail}</p>}
        </div>
      </div>

      {/* Items */}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-gray-50">
            <th className={th}>#</th>
            <th className={th}>Description</th>
            <th className={`${th} text-right`}>Qty</th>
            <th className={`${th} text-right`}>Rate</th>
            <th className={`${th} text-right`}>Taxable value</th>
            <th className={`${th} text-right`}>GST</th>
            <th className={`${th} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={i}>
              <td className={td}>{i + 1}</td>
              <td className={td}>
                <span className="font-medium text-gray-900">{l.name}</span>
                {l.variantLabel && <span className="block text-gray-500">{l.variantLabel}</span>}
              </td>
              <td className={`${td} text-right`}>{l.qty}</td>
              <td className={`${td} text-right`}>{inr(l.unitBase)}</td>
              <td className={`${td} text-right`}>{inr(l.taxable)}</td>
              <td className={`${td} text-right`}>{l.rate ? `${l.rate}% · ${inr(l.taxAmount)}` : '—'}</td>
              <td className={`${td} text-right font-medium`}>{inr(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-6 mt-4">
        {/* Tax summary */}
        <div>
          {inv.taxGroups.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">GST summary</p>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className={th}>Rate</th>
                    <th className={`${th} text-right`}>Taxable</th>
                    {inter ? <th className={`${th} text-right`}>IGST</th> : (<><th className={`${th} text-right`}>CGST</th><th className={`${th} text-right`}>SGST</th></>)}
                  </tr>
                </thead>
                <tbody>
                  {inv.taxGroups.map((g) => (
                    <tr key={g.rate}>
                      <td className={td}>{g.rate}%</td>
                      <td className={`${td} text-right`}>{inr(g.taxable)}</td>
                      {inter
                        ? <td className={`${td} text-right`}>{inr(g.igst)}</td>
                        : (<><td className={`${td} text-right`}>{inr(g.cgst)}</td><td className={`${td} text-right`}>{inr(g.sgst)}</td></>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-gray-400 mt-1">{inter ? 'Inter-state supply: IGST applies.' : 'Intra-state supply: CGST + SGST apply.'}</p>
            </>
          )}
        </div>

        {/* Totals */}
        <div className="space-y-1">
          <Row label="Taxable value" value={inr(inv.taxableTotal)} />
          {inv.taxTotal > 0 && <Row label="Total GST" value={inr(inv.taxTotal)} />}
          {inv.discount > 0 && <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`− ${inr(inv.discount)}`} />}
          <Row label="Shipping" value={inv.shipping === 0 ? 'Free' : inr(inv.shipping)} />
          {inv.codFee > 0 && <Row label="Cash on Delivery fee" value={inr(inv.codFee)} />}
          {inv.roundOff !== 0 && <Row label="Round off" value={inr(inv.roundOff)} />}
          <div className="flex justify-between pt-2 mt-1 border-t-2 border-gray-800 text-sm font-bold text-gray-900">
            <span>Grand total</span><span>{inr(inv.grandTotal)}</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-gray-700"><span className="text-gray-500">Amount in words:</span> <span className="font-medium">{inv.inWords}</span></p>

      <div className="mt-8 pt-3 border-t border-gray-200 text-[10px] text-gray-500 space-y-0.5">
        <p>Returns are accepted within {site.returnWindowDays} days of delivery. See our Returns &amp; Refunds Policy on our website.</p>
        <p>This is a computer-generated invoice and does not require a signature.</p>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return <div className="flex justify-between"><span className="text-gray-600">{label}</span><span>{value}</span></div>
}