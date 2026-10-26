// src/utils/exportCustomers.js
import * as XLSX from 'xlsx'
import { formatPrice, formatDate } from './formatters'

export function exportCustomersToExcel(customers) {
  if (!customers?.length) return

  // ── Main customers sheet ─────────────────────────────────────────────
  const customerRows = customers.map((c) => ({
    'Name':          c.displayName  || '—',
    'Email':         c.email        || '—',
    'Role':          c.role         || 'customer',
    'Status':        c.blocked ? 'Blocked' : 'Active',
    'Total Orders':  c._totalOrders || 0,
    'Total Spent':   c._totalSpent  || 0,
    'Total Spent (₹)': formatPrice(c._totalSpent || 0),
    'Joined':        formatDate(c.createdAt) || '—',
    'Wishlist Items': c.wishlist?.length || 0,
    'Addresses':     c.addresses?.length || 0,
    'User ID':       c.id,
  }))

  // ── Addresses sheet ──────────────────────────────────────────────────
  const addressRows = []
  customers.forEach((c) => {
    if (!c.addresses?.length) return
    c.addresses.forEach((addr) => {
      addressRows.push({
        'Customer Name':  c.displayName || '—',
        'Customer Email': c.email       || '—',
        'Label':          addr.label    || '—',
        'Full Name':      addr.fullName || '—',
        'Phone':          addr.phone    || '—',
        'Line 1':         addr.line1    || '—',
        'Line 2':         addr.line2    || '—',
        'City':           addr.city     || '—',
        'State':          addr.state    || '—',
        'Pincode':        addr.pincode  || '—',
      })
    })
  })

  // ── Build workbook ───────────────────────────────────────────────────
  const wb   = XLSX.utils.book_new()
  const wsCustomers  = XLSX.utils.json_to_sheet(customerRows)
  const wsAddresses  = XLSX.utils.json_to_sheet(
    addressRows.length ? addressRows : [{ Note: 'No addresses found' }]
  )

  // Column widths for customers sheet
  wsCustomers['!cols'] = [
    { wch: 22 }, // Name
    { wch: 30 }, // Email
    { wch: 12 }, // Role
    { wch: 10 }, // Status
    { wch: 14 }, // Total Orders
    { wch: 14 }, // Total Spent (number)
    { wch: 18 }, // Total Spent (formatted)
    { wch: 18 }, // Joined
    { wch: 16 }, // Wishlist
    { wch: 12 }, // Addresses
    { wch: 32 }, // User ID
  ]

  // Column widths for addresses sheet
  wsAddresses['!cols'] = [
    { wch: 22 }, { wch: 30 }, { wch: 10 }, { wch: 22 },
    { wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 16 },
    { wch: 18 }, { wch: 10 },
  ]

  XLSX.utils.book_append_sheet(wb, wsCustomers,  'Customers')
  XLSX.utils.book_append_sheet(wb, wsAddresses,  'Addresses')

  // ── Download ─────────────────────────────────────────────────────────
  const date     = new Date().toISOString().slice(0, 10)
  const filename = `shopnext-customers-${date}.xlsx`
  XLSX.writeFile(wb, filename)
}

// Export only filtered/searched customers
export function exportFilteredCustomers(customers, label = 'filtered') {
  if (!customers?.length) return
  const date     = new Date().toISOString().slice(0, 10)
  const filename = `shopnext-customers-${label}-${date}.xlsx`

  const rows = customers.map((c) => ({
    'Name':           c.displayName  || '—',
    'Email':          c.email        || '—',
    'Role':           c.role         || 'customer',
    'Status':         c.blocked ? 'Blocked' : 'Active',
    'Total Orders':   c._totalOrders || 0,
    'Total Spent (₹)': formatPrice(c._totalSpent || 0),
    'Joined':         formatDate(c.createdAt) || '—',
    'User ID':        c.id,
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  ws['!cols'] = [
    { wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 10 },
    { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 32 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Customers')
  XLSX.writeFile(wb, filename)
}