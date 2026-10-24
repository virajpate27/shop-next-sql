// lib/auth/password.js
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

export const hashPassword = (pw) => bcrypt.hash(pw, 10)
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash)

/**
 * Verify a password against a legacy Firebase Auth hash (modified scrypt).
 * Needs the project's hash parameters (Firebase console → Authentication → ⋮ → Password hash parameters):
 *   FB_SIGNER_KEY (base64), FB_SALT_SEPARATOR (base64), FB_ROUNDS, FB_MEM_COST
 * VERIFY THIS against one real exported account on Day 2 before relying on it.
 * If it doesn't match, fall back to "reset your password" emails for migrated users.
 */
export function firebaseScryptVerify(password, saltB64, hashB64) {
  const { FB_SIGNER_KEY, FB_SALT_SEPARATOR, FB_ROUNDS, FB_MEM_COST } = process.env
  if (!FB_SIGNER_KEY || !FB_SALT_SEPARATOR || !FB_ROUNDS || !FB_MEM_COST) return false
  const salt = Buffer.concat([Buffer.from(saltB64, 'base64'), Buffer.from(FB_SALT_SEPARATOR, 'base64')])
  const N = 2 ** Number(FB_MEM_COST)
  const r = Number(FB_ROUNDS)
  const dk = crypto.scryptSync(password, salt, 32, { N, r, p: 1, maxmem: 256 * N * r })
  const cipher = crypto.createCipheriv('aes-256-ctr', dk, Buffer.alloc(16))
  const out = Buffer.concat([cipher.update(Buffer.from(FB_SIGNER_KEY, 'base64')), cipher.final()])
  const expected = Buffer.from(hashB64, 'base64')
  return out.length === expected.length && crypto.timingSafeEqual(out, expected)
}
