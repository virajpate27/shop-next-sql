import { NextResponse } from 'next/server'
import { query, iso } from '@/lib/db'
import { withAdmin } from '@/lib/auth/guards'
import { rowToAddress } from '@/lib/repo/addresses'

// One SQL aggregate instead of downloading every order into the browser
export const GET = withAdmin(async () => {
  const users = await query(`
    SELECT u.id,u.email,u.display_name,u.photo_url,u.role,u.blocked,u.created_at,
           COUNT(o.id) AS total_orders,
           COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total END),0) AS total_spent
    FROM users u LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.id ORDER BY u.created_at DESC`)
  const addr = await query('SELECT * FROM addresses ORDER BY created_at')
  const byUser = {}
  for (const a of addr) (byUser[a.user_id] ||= []).push(rowToAddress(a))
  return NextResponse.json({ customers: users.map((u) => ({
    id: u.id, uid: u.id, email: u.email, displayName: u.display_name, photoURL: u.photo_url, role: u.role,
    blocked: !!u.blocked, createdAt: iso(u.created_at), addresses: byUser[u.id] || [],
    _totalOrders: Number(u.total_orders), _totalSpent: Number(u.total_spent),
  })) })
})
