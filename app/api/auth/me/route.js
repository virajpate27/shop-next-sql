import { NextResponse } from 'next/server'
import { one, query } from '@/lib/db'
import { withAuth } from '@/lib/auth/guards'
import { getSessionUser, isEmailVerified } from '@/lib/auth/guards'
import { COOKIE, clearSessionCookie } from '@/lib/auth/session'

// Same shape the old Firestore `users/{uid}` profile had, so AuthContext/useWishlist keep working.
async function profile(uid, sessionUser) {
  const u = await one('SELECT id,email,display_name,photo_url,role,blocked FROM users WHERE id=?', [uid])
  if (!u) return null
  const w = await query('SELECT product_id FROM wishlist WHERE user_id=? ORDER BY created_at', [uid])
  return {
    uid: u.id, id: u.id, email: u.email, displayName: u.display_name, photoURL: u.photo_url,
    role: u.role, blocked: !!u.blocked, wishlist: w.map((r) => r.product_id),
    emailVerified: sessionUser ? isEmailVerified(sessionUser) : true, // drives the "verify your email" banner
  }
}

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } }

export async function GET(req) {
  const hadCookie = !!req.cookies.get(COOKIE)?.value
  const su = await getSessionUser(req)
  const user = su ? await profile(su.id, su) : null
  if (!user) {
    // A cookie that no longer works (expired, blocked, or ended by a password change) is removed here, otherwise the
    // login page would keep redirecting this browser away because it still "looks" signed in.
    const res = NextResponse.json({ user: null }, NO_STORE)
    return hadCookie ? clearSessionCookie(res) : res
  }
  return NextResponse.json({ user }, NO_STORE)
}

// Replaces profile page's updateFirebaseProfile + updateDoc(displayName)
export const PATCH = withAuth(async (req, _ctx, auth) => {
  const { displayName } = await req.json()
  if (!displayName?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  await query('UPDATE users SET display_name=? WHERE id=?', [displayName.trim(), auth.uid])
  return NextResponse.json({ user: await profile(auth.uid, { email_verified_at: auth.emailVerified ? 1 : null }) })
})