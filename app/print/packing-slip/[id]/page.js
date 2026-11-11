'use client'
import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getOrderById } from '@/lib/api/orders'
import { SITE } from '@/lib/siteConfig'
import PackingSlipDocument from '@/components/print/PackingSlipDocument'
import PrintShell from '@/components/print/PrintShell'

function Content() {
  const { id } = useParams()
  const { isAdmin, loading: authLoading } = useAuth()
  const [state, setState] = useState({ loading: true, order: null, error: '' })

  useEffect(() => {
    if (authLoading || !isAdmin) return
    let alive = true
    getOrderById(id)
      .then((order) => alive && setState({ loading: false, order, error: '' }))
      .catch(() => alive && setState({ loading: false, order: null, error: 'Order not found.' }))
    return () => { alive = false }
  }, [id, authLoading, isAdmin])

  const spinner = <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
  const { loading, order, error } = state

  return (
    <PrintShell title={order ? `Packing slip · order #${String(order.id).slice(0, 8).toUpperCase()}` : 'Packing slip'} ready={!!order}>
      {authLoading ? spinner
        : !isAdmin ? <p className="p-16 text-center text-gray-500">Packing slips are for store staff only.</p>
        : loading ? spinner
        : error || !order ? <p className="p-16 text-center text-gray-500">{error || 'Order not found.'}</p>
        : <PackingSlipDocument order={order} site={SITE} />}
    </PrintShell>
  )
}

export default function PackingSlipPage() {
  return <Suspense fallback={null}><Content /></Suspense>
}