// lib/reviewName.js — what the public sees as the reviewer's name: "Viraj A. Patel" → "Viraj P."
// (never an e-mail address, never a full surname)
export function publicReviewName(displayName) {
  const clean = String(displayName ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean || clean.includes('@')) return 'Verified customer'
  const parts = clean.split(' ')
  const first = parts[0].slice(0, 24)
  const last = parts.length > 1 ? parts[parts.length - 1] : ''
  return last ? `${first} ${last[0].toUpperCase()}.` : first
}