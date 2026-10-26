import { query } from '@/lib/db'
import { sendEmail } from '@/lib/sendEmail'
import { ADMIN_EMAIL } from '@/lib/resend'
import { lowStockEmail } from '@/emails/templates'
import { rowToProduct } from '@/lib/repo/products'

export async function sendLowStockAlert() {
  const rows = await query('SELECT * FROM products WHERE stock <= 10 ORDER BY stock ASC')
  if (!rows.length) return { message: 'All products well stocked', alerted: 0 }
  const t = lowStockEmail({ products: rows.map(rowToProduct) })
  await sendEmail({ to: ADMIN_EMAIL, subject: t.subject, html: t.html })
  return { success: true, alerted: rows.length }
}
