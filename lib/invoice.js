// lib/invoice.js — pure invoice maths (no React, no DB). Used by the printable invoice page.
import { calculateTax } from '@/utils/tax'

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const two = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ''))
const three = (n) => (n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${two(n % 100)}` : ''}` : two(n))

function words(n) {                       // Indian numbering: thousand, lakh, crore
  if (n === 0) return 'Zero'
  const out = []
  const crore = Math.floor(n / 1e7); n %= 1e7
  const lakh = Math.floor(n / 1e5); n %= 1e5
  const thousand = Math.floor(n / 1e3); n %= 1e3
  if (crore) out.push(`${words(crore)} Crore`)
  if (lakh) out.push(`${two(lakh)} Lakh`)
  if (thousand) out.push(`${two(thousand)} Thousand`)
  if (n) out.push(three(n))
  return out.join(' ')
}

/** 1234.5 → "Rupees One Thousand Two Hundred Thirty Four and Fifty Paise Only" */
export function amountInWords(amount) {
  const total = Math.round(Number(amount) * 100)
  if (!Number.isFinite(total) || total < 0) return ''
  const rupees = Math.floor(total / 100), paise = total % 100
  return `Rupees ${words(rupees)}${paise ? ` and ${two(paise)} Paise` : ''} Only`
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '')

/**
 * Intra-state sale → CGST + SGST; inter-state → IGST. Decided by comparing the customer's state with yours.
 * If your state isn't configured yet, we keep the CGST/SGST layout the order page already shows and flag it.
 */
export function gstMode(buyerState, sellerState) {
  const b = norm(buyerState), s = norm(sellerState)
  if (!b || !s || s.startsWith('edit')) return { mode: 'intra', assumed: true }
  return { mode: b === s ? 'intra' : 'inter', assumed: false }
}

const IST = 'Asia/Kolkata'
export const formatInvoiceDate = (iso) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST }).format(new Date(iso))

/** Derived from the order date and id (not a sequential GST series — see README). */
export function invoiceNumber(order) {
  const ymd = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: IST }).format(new Date(order.createdAt)).replace(/-/g, '')
  return `INV-${ymd}-${String(order.id).slice(0, 6).toUpperCase()}`
}

/** Everything the invoice page prints, computed with the SAME tax function the order was priced with. */
export function buildInvoice(order, site = {}) {
  const gst = gstMode(order.shippingAddress?.state, site.state)

  const lines = (order.items || []).map((it) => {
    const qty = Math.max(1, Number(it.quantity) || 1)
    const t = calculateTax(Number(it.price) || 0, Number(it.taxRate) || 0, it.taxType, qty)
    return {
      name: it.name, variantLabel: it.variantLabel || '', qty, rate: t.taxRate,
      unitBase: t.basePrice, taxable: r2(t.basePrice * qty), taxAmount: t.taxAmount, total: t.totalWithQty,
    }
  })

  const byRate = {}
  for (const l of lines) {
    if (!l.rate) continue
    const g = (byRate[l.rate] ||= { rate: l.rate, taxable: 0, tax: 0 })
    g.taxable += l.taxable; g.tax += l.taxAmount
  }
  const taxGroups = Object.values(byRate).map((g) => {
    const tax = r2(g.tax), cgst = r2(tax / 2)
    return { rate: g.rate, taxable: r2(g.taxable), tax, cgst, sgst: r2(tax - cgst), igst: tax }
  }).sort((a, b) => a.rate - b.rate)

  const taxableTotal = r2(lines.reduce((s, l) => s + l.taxable, 0))
  const taxTotal = r2(lines.reduce((s, l) => s + l.taxAmount, 0))
  const itemsTotal = r2(lines.reduce((s, l) => s + l.total, 0))
  const discount = r2(order.discount || 0), shipping = r2(order.shipping || 0), codFee = r2(order.codFee || 0)
  const grandTotal = r2(order.total)
  const roundOff = r2(grandTotal - (itemsTotal - discount + shipping + codFee))   // tiny rounding only; normally 0

  return {
    number: invoiceNumber(order), date: formatInvoiceDate(order.createdAt),
    gst, lines, taxGroups, taxableTotal, taxTotal, itemsTotal, discount, shipping, codFee,
    roundOff: Math.abs(roundOff) <= 1 ? roundOff : 0, grandTotal, inWords: amountInWords(grandTotal),
    paid: order.paymentMethod === 'cod' ? order.status === 'delivered' : !!order.razorpayPaymentId,
  }
}

/** An invoice exists once the order is confirmed (paid online, or placed as COD) and not cancelled. */
export const canInvoice = (order) => !!order && ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)