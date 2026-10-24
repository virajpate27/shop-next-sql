// lib/authFetch.js — same signature as before; auth is now an httpOnly cookie, so no token juggling.
export async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (res.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('auth:expired'))
  return res
}
