import { json } from '@/lib/db'
const KEYS = ['label', 'fullName', 'phone', 'line1', 'line2', 'city', 'state', 'pincode']
export const rowToAddress = (r) => ({ ...(json(r.data, {}) || {}), id: r.id })
export function cleanAddress(a = {}) {
  const out = {}
  for (const k of KEYS) out[k] = String(a[k] ?? '').slice(0, 200)
  out.isDefault = !!a.isDefault
  return out
}
export const newAddressId = () => `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
