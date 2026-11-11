'use client'
import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getOrderById } from '@/lib/api/orders'
import { canInvoice } from '@/lib/invoice'
import { SITE } from '@/lib/siteConfig'
import InvoiceDocument from '@/components/print/InvoiceDocument'
import PrintShell from '@/components/print/PrintShell'

function Content() {
  const { id } = useParams()
  const [state, setState] = useState({ loading: true, order: null, error: '' })

  useEffect(() => {
    let alive = true
    getOrderById(id)
      .then((order) => alive && setState({ loading: false, order, error: '' }))
      .catch((e) => alive && setState({ loading: false, order: null, error: e.status === 404 || e.status === 403 ? 'Order not found.' : 'Could not load this order. Please try again.' }))
    return () => { alive = false }
  }, [id])

  const { loading, order, error } = state
  const ok = !!order && canInvoice(order)
  const message = loading ? null
    : error ? error
    : !order ? 'Order not found.'
    : order.status === 'cancelled' ? 'This order was cancelled, so there is no invoice.'
    : !ok ? 'An invoice is available once your order is confirmed.'
    : null

  return (
    <PrintShell title={order ? `Invoice · order #${String(order.id).slice(0, 8).toUpperCase()}` : 'Invoice'} ready={ok}>
      {loading ? (
        <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : message ? (
        <p className="p-16 text-center text-gray-500">{message}</p>
      ) : (
        <InvoiceDocument order={order} site={SITE} />
      )}
    </PrintShell>
  )
}

export default function InvoicePage() {
  return <Suspense fallback={null}><Content /></Suspense>
}