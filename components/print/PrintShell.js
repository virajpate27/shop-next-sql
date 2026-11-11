'use client'
// components/print/PrintShell.js — screen toolbar + A4 sheet. The toolbar never prints.
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function PrintShell({ title, ready, children }) {
  const sp = useSearchParams()

  // /print/...?print=1 opens the browser's print dialog by itself once the document is on screen
  useEffect(() => {
    if (!ready || sp.get('print') !== '1') return
    const t = setTimeout(() => window.print(), 500)
    return () => clearTimeout(t)
  }, [ready, sp])

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white py-6 print:py-0">
      <style>{'@page { size: A4; margin: 10mm; } @media print { html, body { background: #fff !important; } }'}</style>
      <div className="print:hidden max-w-[210mm] mx-auto mb-4 px-2 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{title}</p>
        <div className="flex gap-2">
          <button onClick={() => window.print()} disabled={!ready}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            Print / Save as PDF
          </button>
          <button onClick={() => window.close()} className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
      <div className="max-w-[210mm] mx-auto bg-white shadow print:shadow-none">{children}</div>
    </div>
  )
}