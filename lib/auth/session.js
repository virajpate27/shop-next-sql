// lib/auth/session.js — stateless session cookie (JWT, HS256). Works in Node AND Edge (middleware).
import { SignJWT, jwtVerify } from 'jose'

export const COOKIE = 'session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET) // 32+ random chars

export async function signSession(uid) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' })
    .setSubject(uid).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key())
}

/** { uid, iat } or null. iat (seconds) lets us end sessions issued before a password change. */
export async function verifySessionPayload(token) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key())
    return payload.sub ? { uid: payload.sub, iat: payload.iat || 0 } : null
  } catch { return null }
}

/** Returns uid or null (signature + expiry only; revocation is checked against the DB in guards.js). */
export async function verifySession(token) {
  return (await verifySessionPayload(token))?.uid || null
}

export function setSessionCookie(res, token) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
export function clearSessionCookie(res) {
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
