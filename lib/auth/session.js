// lib/auth/session.js — stateless session cookie (JWT, HS256). Works in Node AND Edge (middleware).
import { SignJWT, jwtVerify } from 'jose'

export const COOKIE = 'session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET) // 32+ random chars

export async function signSession(uid) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' })
    .setSubject(uid).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key())
}

/** Returns uid or null. */
export async function verifySession(token) {
  if (!token) return null
  try { return (await jwtVerify(token, key())).payload.sub || null } catch { return null }
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
