// lib/auth/guards.js — drop-in replacement for lib/firebase/verifyAuth.js (same withAuth/withAdmin API)
import { one } from '@/lib/db'
import { COOKIE, verifySession } from '@/lib/auth/session'

export class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status }
}

export async function getAuthUser(req) {
  // Basic CSRF defence for cookie auth: reject cross-origin state-changing requests.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin')
    if (origin && new URL(origin).host !== req.headers.get('host')) {
      throw new HttpError(403, 'Access denied — bad origin')
    }
  }
  const uid = await verifySession(req.cookies.get(COOKIE)?.value)
  if (!uid) throw new HttpError(401, 'Missing or invalid session')
  // Read role/blocked fresh from the DB (one indexed lookup) so changes apply immediately
  const u = await one('SELECT id, email, role, blocked FROM users WHERE id = ?', [uid])
  if (!u) throw new HttpError(401, 'User not found')
  if (u.blocked) throw new HttpError(403, 'Access denied — account blocked')
  return { uid: u.id, email: u.email, role: u.role }
}

export const verifyAuthToken = getAuthUser

export async function verifyAdmin(req) {
  const a = await getAuthUser(req)
  if (a.role !== 'admin') throw new HttpError(403, 'Access denied — admin only')
  return a
}

const fail = (err) => Response.json({ error: err.message }, { status: err.status || 500 })

export function withAuth(handler) {
  return async (req, context) => {
    try { return await handler(req, context, await getAuthUser(req)) } catch (e) { return fail(e) }
  }
}
export function withAdmin(handler) {
  return async (req, context) => {
    try { return await handler(req, context, await verifyAdmin(req)) } catch (e) { return fail(e) }
  }
}
