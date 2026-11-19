// lib/auth/revocation.js — pure rules for ending sessions after a password change/reset (no imports on purpose)

/** pw_changed_at is stored with whole-second precision, so the device that just changed the password stays signed in. */
export const startOfSecond = (d = new Date()) => new Date(Math.floor(d.getTime() / 1000) * 1000)

/** A session cookie (JWT "iat" in seconds) is dead if it was issued before the last password change. */
export function isSessionRevoked(iatSeconds, pwChangedAt) {
  if (!pwChangedAt) return false
  const changed = new Date(pwChangedAt).getTime()
  if (Number.isNaN(changed)) return false
  return (Number(iatSeconds) || 0) * 1000 < changed
}