import { NextResponse } from 'next/server'
import { one, query } from '@/lib/db'
import { withAuth } from '@/lib/auth/guards'
import { COOKIE, verifySession } from '@/lib/auth/session'

// Same shape the old Firestore `users/{uid}` profile had, so AuthContext/useWishlist keep working.
async function profile(uid) {
  const u = await one('SELECT id,email,display_name,photo_url,role,blocked FROM users WHERE id=?', [uid])
  if (!u) return null
  const w = await query('SELECT product_id FROM wishlist WHERE user_id=? ORDER BY created_at', [uid])
  return {
    uid: u.id, id: u.id, email: u.email, displayName: u.display_name, photoURL: u.photo_url,
    role: u.role, blocked: !!u.blocked, wishlist: w.map((r) => r.product_id),
  }
}

export async function GET(req) {
  const uid = await verifySession(req.cookies.get(COOKIE)?.value)
  if (!uid) return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } })
  const user = await profile(uid)
  if (!user || user.blocked) return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } })
}

// Replaces profile page's updateFirebaseProfile + updateDoc(displayName)
export const PATCH = withAuth(async (req, _ctx, auth) => {
  const { displayName } = await req.json()
  if (!displayName?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  await query('UPDATE users SET display_name=? WHERE id=?', [displayName.trim(), auth.uid])
  return NextResponse.json({ user: await profile(auth.uid) })
})
