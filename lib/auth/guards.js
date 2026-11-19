// lib/auth/guards.js — drop-in replacement for lib/firebase/verifyAuth.js (same withAuth/withAdmin API)
import { one } from '@/lib/db'
import { COOKIE, verifySessionPayload } from '@/lib/auth/session'
import { isSessionRevoked } from '@/lib/auth/revocation'

export class HttpError extends Error {
  constructor(status, msg, data) { super(msg); this.status = status; this.data = data }
}

let warnedMissingColumns = false

/**
 * The auth row for a user id. If migration 003 has not been run yet (columns missing) it falls back to the old columns,
 * so a forgotten SQL step can never lock every customer out: password-change logout and email verification are simply
 * inactive until the migration is applied.
 */
export async function selectAuthUser(uid, queryOne = one) {
  try {
    return await queryOne('SELECT id, email, role, blocked, pw_changed_at, email_verified_at FROM users WHERE id = ?', [uid])
  } catch (err) {
    if (err?.code !== 'ER_BAD_FIELD_ERROR') throw err
    if (!warnedMissingColumns) {
      warnedMissingColumns = true
      console.error('[auth] users.pw_changed_at / email_verified_at are missing: run db/migrations/003_trust_columns.sql. Falling back to the old columns until then.')
    }
    return queryOne('SELECT id, email, role, blocked FROM users WHERE id = ?', [uid])
  }
}

/** Logged-in user row, or null (logged out, bad/expired cookie, blocked, or session ended by a password change). Never throws. */
export async function getSessionUser(req) {
  const p = await verifySessionPayload(req.cookies.get(COOKIE)?.value)
  if (!p) return null
  const u = await selectAuthUser(p.uid)
  if (!u || u.blocked || isSessionRevoked(p.iat, u.pw_changed_at)) return null
  return u
}

/** true / false, or true when the column does not exist yet (feature inactive) */
export const isEmailVerified = (u) => ('email_verified_at' in u ? !!u.email_verified_at : true)

export async function getAuthUser(req) {
  // Basic CSRF defence for cookie auth: reject cross-origin state-changing requests.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin')
    if (origin) {
      let oh = ''
      try { oh = new URL(origin).host } catch {}
      const allowed = new Set([
        req.headers.get('host'), req.headers.get('x-forwarded-host'),
        (() => { try { return new URL(process.env.NEXT_PUBLIC_APP_URL).host } catch { return null } })(),
      ].filter(Boolean))
      if (!allowed.has(oh)) throw new HttpError(403, 'Access denied — bad origin')
    }
  }
  const p = await verifySessionPayload(req.cookies.get(COOKIE)?.value)
  if (!p) throw new HttpError(401, 'Missing or invalid session')
  // Read role/blocked fresh from the DB (one indexed lookup) so changes apply immediately
  const u = await selectAuthUser(p.uid)
  if (!u) throw new HttpError(401, 'User not found')
  if (u.blocked) throw new HttpError(403, 'Access denied — account blocked')
  if (isSessionRevoked(p.iat, u.pw_changed_at)) throw new HttpError(401, 'Your session has ended. Please sign in again.')
  return { uid: u.id, email: u.email, role: u.role, emailVerified: isEmailVerified(u) }
}

export const verifyAuthToken = getAuthUser

export async function verifyAdmin(req) {
  const a = await getAuthUser(req)
  if (a.role !== 'admin') throw new HttpError(403, 'Access denied — admin only')
  return a
}

const fail = (err) => {
  if (err instanceof HttpError) return Response.json({ error: err.message, ...(err.data || {}) }, { status: err.status })
  console.error('[api] unexpected error:', err)               // full detail stays in server logs
  return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

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