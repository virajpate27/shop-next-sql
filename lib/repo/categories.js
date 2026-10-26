import { query, iso, json } from '@/lib/db'
import { slugify } from '@/lib/repo/products'

export const rowToCategory = (r) => ({
  ...(json(r.data, {}) || {}), id: r.id, name: r.name, slug: r.slug, createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
})
export async function listCategories() {
  const rows = await query('SELECT * FROM categories')
  return rows.map(rowToCategory).sort((a, b) => a.name.localeCompare(b.name))
}
export function splitCategory(d) {
  const { id, name, slug, createdAt, updatedAt, ...rest } = d || {}
  return { name: String(name || '').trim(), slug: slugify(name || ''), data: JSON.stringify(rest) }
}
