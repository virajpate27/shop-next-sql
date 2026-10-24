// lib/auth/client.js — replaces lib/firebase/auth.js. Same export names, so pages only change their import path.
async function post(url, body) {
  const res = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) { const e = new Error(data.error || 'Request failed'); e.code = res.status; throw e }
  return data
}

export async function loginWithEmail(email, password) { return (await post('/api/auth/login', { email, password })).user }
export async function registerWithEmail(email, password, name) { return (await post('/api/auth/register', { email, password, name })).user }
export async function logout() { await post('/api/auth/logout') }
export async function resetPassword(email) { await post('/api/auth/forgot-password', { email }) }

export async function getUserProfile() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
  return res.ok ? (await res.json()).user : null
}

// Google popup (Google Identity Services, OAuth token flow). Needs NEXT_PUBLIC_GOOGLE_CLIENT_ID.
function loadGsi() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'; s.onload = resolve; s.onerror = () => reject(new Error('Google sign-in failed to load'))
    document.head.appendChild(s)
  })
}
export async function loginWithGoogle() {
  await loadGsi()
  const accessToken = await new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error || 'Google sign-in cancelled'))),
      error_callback: () => reject(new Error('Google sign-in cancelled')),
    })
    client.requestAccessToken()
  })
  return (await post('/api/auth/google', { accessToken })).user
}
