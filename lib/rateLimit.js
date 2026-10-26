// lib/rateLimit.js — tiny in-memory limiter (one Node process on Hostinger = one counter map).
// Good enough to stop password guessing / email spam. Not shared across multiple instances.
const buckets = new Map()

export function rateLimit(key, { max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.reset) { buckets.set(key, { n: 1, reset: now + windowMs }); return { ok: true } }
  b.n += 1
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k)
  return b.n > max ? { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) } : { ok: true }
}

export const clientIp = (req) =>
  (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
