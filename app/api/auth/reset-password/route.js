import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { one, query } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'

export async function POST(req) {
  const { token, password } = await req.json().catch(() => ({}))
  if (!token || !password || password.length < 8) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const h = crypto.createHash('sha256').update(token).digest('hex')
  const r = await one('SELECT user_id FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()', [h])
  if (!r) return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 })
  await query('UPDATE users SET password_hash=?, fb_hash=NULL, fb_salt=NULL WHERE id=?', [await hashPassword(password), r.user_id])
  await query('UPDATE password_resets SET used_at=UTC_TIMESTAMP() WHERE token_hash=?', [h])
  return NextResponse.json({ ok: true })
}
