// lib/repo/account.js — server-only. Password change/reset side effects and email verification.
import crypto from 'node:crypto'
import { one, query, tx } from '@/lib/db'
import { HttpError } from '@/lib/auth/guards'
import { checkPassword, hashPassword, firebaseScryptVerify } from '@/lib/auth/password'
import { startOfSecond } from '@/lib/auth/revocation'

export const MIN_PASSWORD = 8
export const MAX_PASSWORD = 72 // bcrypt only uses the first 72 bytes: longer passwords would be silently cut

/** '' when fine, otherwise the message to show. */
export function validateNewPassword(pw) {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters`
  if (pw.length > MAX_PASSWORD) return `Password can be at most ${MAX_PASSWORD} characters`
  return ''
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const isMissingColumn = (e) => e?.code === 'ER_BAD_FIELD_ERROR'

/**
 * Set a new password and end every other session (pw_changed_at). If migration 003 isn't applied yet, the password still
 * changes; only the "sign out other devices" part is skipped.
 */
async function writePassword(userId, newPassword, { markVerified = false } = {}) {
  const hash = await hashPassword(newPassword)
  const when = startOfSecond()
  try {
    await query(
      `UPDATE users SET password_hash = ?, fb_hash = NULL, fb_salt = NULL, pw_changed_at = ?${markVerified ? ', email_verified_at = COALESCE(email_verified_at, ?)' : ''} WHERE id = ?`,
      markVerified ? [hash, when, when, userId] : [hash, when, userId])
  } catch (e) {
    if (!isMissingColumn(e)) throw e
    console.error('[account] migration 003 not applied: password changed, but other sessions were NOT ended')
    await query('UPDATE users SET password_hash = ?, fb_hash = NULL, fb_salt = NULL WHERE id = ?', [hash, userId])
  }
  return when
}

/** Logged-in "change password". A wrong current password is a 403 (a 401 would sign the person out in the browser). */
export async function changePassword({ userId, currentPassword, newPassword }) {
  const problem = validateNewPassword(newPassword)
  if (problem) throw new HttpError(400, problem)
  const u = await one('SELECT id, password_hash, fb_hash, fb_salt FROM users WHERE id = ?', [userId])
  if (!u) throw new HttpError(401, 'User not found')

  const current = String(currentPassword ?? '')
  let ok = false
  if (u.password_hash) ok = await checkPassword(current, u.password_hash)
  else if (u.fb_hash && u.fb_salt) ok = firebaseScryptVerify(current, u.fb_salt, u.fb_hash) // not yet upgraded legacy account
  else throw new HttpError(400, 'Your account signs in with Google, so it has no password yet. Use "Forgot password" on the sign-in page to create one.')
  if (!ok) throw new HttpError(403, 'Your current password is incorrect')
  if (current === newPassword) throw new HttpError(400, 'Choose a password that is different from your current one')

  return { changedAt: await writePassword(userId, newPassword) }
}

/** After a successful "forgot password" reset: new password, other sessions ended, and the mailbox is proven → verified. */
export const setPasswordAfterReset = (userId, newPassword) => writePassword(userId, newPassword, { markVerified: true })

/** Google confirmed the address → verified. Never throws (feature may be inactive before the migration). */
export async function markEmailVerified(userId) {
  try { await query('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?', [new Date(), userId]) }
  catch (e) { if (!isMissingColumn(e)) console.error('[account] markEmailVerified failed:', e.message) }
}

// ── email verification links ──
export async function createEmailVerification(userId, email) {
  const token = crypto.randomBytes(32).toString('hex')
  await query('INSERT INTO email_verifications (token_hash, user_id, email, expires_at) VALUES (?, ?, ?, ?)',
    [sha(token), userId, email, new Date(Date.now() + 24 * 60 * 60 * 1000)])
  return token
}

/** Single-use, 24h, and only valid while the account still has the address the link was sent to. */
export async function verifyEmailToken(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) return { ok: false }
  return tx(async (conn) => {
    const [[r]] = await conn.query('SELECT * FROM email_verifications WHERE token_hash = ? FOR UPDATE', [sha(token)])
    if (!r || r.used_at || new Date(r.expires_at) < new Date()) return { ok: false }
    const [[u]] = await conn.query('SELECT id, email FROM users WHERE id = ? FOR UPDATE', [r.user_id])
    if (!u || String(u.email).toLowerCase() !== String(r.email).toLowerCase()) return { ok: false }
    const now = new Date()
    await conn.query('UPDATE email_verifications SET used_at = ? WHERE token_hash = ?', [now, r.token_hash])
    await conn.query('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?', [now, u.id])
    return { ok: true, userId: u.id }
  })
}