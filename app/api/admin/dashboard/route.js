import { NextResponse } from 'next/server'
import { query, one, iso } from '@/lib/db'
import { withAdmin } from '@/lib/auth/guards'
import { rowToOrder } from '@/lib/repo/orders'
import { rowToProduct } from '@/lib/repo/products'

// All dashboard numbers computed in SQL; the browser never downloads every order/product/user.
export const GET = withAdmin(async () => {
  const s = await one(`
    SELECT COUNT(*) orders,
      COALESCE(SUM(CASE WHEN status<>'cancelled' THEN total END),0) revenue,
      COALESCE(SUM(CASE WHEN status<>'cancelled' THEN total_tax END),0) total_tax,
      SUM(status='pending') pending, SUM(payment_method='cod') cod, SUM(payment_method='razorpay') online
    FROM orders`)
  const users = await one('SELECT COUNT(*) n FROM users')
  const p = await one('SELECT COUNT(*) n, SUM(stock>0 AND stock<=10) low, SUM(stock=0) out_of_stock FROM products')
  const recent = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5')
  const week = await query('SELECT created_at, total, status FROM orders WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 9 DAY')
  const lowRows = await query('SELECT * FROM products WHERE stock <= 10 ORDER BY stock ASC LIMIT 5')
  const cats = await query('SELECT category, COUNT(*) n FROM products GROUP BY category')
  return NextResponse.json({
    stats: {
      orders: Number(s.orders), revenue: Number(s.revenue), totalTax: Number(s.total_tax), pendingOrders: Number(s.pending || 0),
      codOrders: Number(s.cod || 0), onlineOrders: Number(s.online || 0), users: Number(users.n), products: Number(p.n),
      lowStockCount: Number(p.low || 0) + Number(p.out_of_stock || 0),
    },
    recentOrders: recent.map(rowToOrder),
    weekOrders: week.map((o) => ({ createdAt: iso(o.created_at), total: o.total, status: o.status })),
    lowStockProducts: lowRows.map(rowToProduct),
    categoryChart: cats.map((c) => ({ category: c.category, count: Number(c.n) })),
  })
})
