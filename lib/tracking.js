// lib/tracking.js — pure helpers for shipment tracking details (client + server)

export const COURIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Ecom Express', 'XpressBees', 'Shadowfax', 'Amazon Shipping', 'Professional Couriers', 'Self delivery', 'Other']

const strip = (s, max) => String(s ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

/**
 * Validate + normalise what the admin typed.
 * → { empty: true }            nothing entered (shipping without tracking is allowed)
 * → { error: '...' }           invalid link
 * → { value: { courier, number, url } }
 * The link must be http(s): a "javascript:" or "data:" link would become a clickable attack on customers.
 */
export function cleanTracking(input = {}) {
  const courier = strip(input.courier, 60)
  const number = strip(input.number, 100)
  let url = strip(input.url, 500).replace(/\s/g, '')
  if (url) {
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`   // "dtdc.in/track" → "https://dtdc.in/track"
    try {
      const u = new URL(url)
      if (!['http:', 'https:'].includes(u.protocol)) return { error: 'The tracking link must start with http:// or https://' }
      url = u.toString()
    } catch {
      return { error: 'The tracking link is not a valid web address' }
    }
  }
  if (!courier && !number && !url) return { empty: true }
  return { value: { courier, number, url } }
}

/** Text added to the timeline entry when an order is shipped. */
export function trackingNote(t) {
  const parts = []
  if (t?.courier) parts.push(`Courier: ${t.courier}`)
  if (t?.number) parts.push(`Tracking no. ${t.number}`)
  return parts.join(' · ')
}