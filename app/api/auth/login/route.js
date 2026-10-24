import { NextResponse } from 'next/server'
import { one, query } from '@/lib/db'
import { checkPassword, hashPassword, firebaseScryptVerify } from '@/lib/auth/password'
import { signSession, setSessionCookie } from '@/lib/auth/session'

const BAD = () => NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) return BAD()
  const u = await one('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase().trim()])
  if (!u) return BAD()
  if (u.blocked) return NextResponse.json({ error: 'This account has been blocked' }, { status: 403 })

  let ok = false
  if (u.password_hash) {
    ok = await checkPassword(password, u.password_hash)
  } else if (u.fb_hash && u.fb_salt) {
    // Migrated Firebase user: verify legacy hash, then upgrade to bcrypt transparently
    ok = firebaseScryptVerify(password, u.fb_salt, u.fb_hash)
    if (ok) {
      await query('UPDATE users SET password_hash=?, fb_hash=NULL, fb_salt=NULL WHERE id=?', [await hashPassword(password), u.id])
    }
  }
  if (!ok) return BAD()

  const res = NextResponse.json({ user: { uid: u.id, email: u.email, displayName: u.display_name, role: u.role } })
  return setSessionCookie(res, await signSession(u.id))
}
