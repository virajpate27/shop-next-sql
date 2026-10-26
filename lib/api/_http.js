// shared fetch helper for lib/api/* — cookie auth, JSON, readable errors
export async function http(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method, credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('auth:expired'))
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}
