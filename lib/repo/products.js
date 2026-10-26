// lib/repo/products.js — server-only. Used by API routes AND server components (home page, sitemap).
import { query, one, newId, iso, json } from '@/lib/db'
import { HttpError } from '@/lib/auth/guards'

export const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')

export function rowToProduct(r) {
  if (!r) return null
  return {
    id: r.id, name: r.name, slug: r.slug, description: r.description || '',
    price: r.price, comparePrice: r.compare_price, category: r.category,
    tags: json(r.tags, []), hasVariations: !!r.has_variations,
    variationTypes: json(r.variation_types, []), variants: json(r.variants, []),
    defaultVariant: json(r.default_variant, {}), stock: r.stock, sku: r.sku || '',
    featured: !!r.featured, images: json(r.images, []), taxRate: r.tax_rate, taxType: r.tax_type,
    rating: r.rating, reviewCount: r.review_count, soldCount: r.sold_count,
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
  }
}

export async function listProducts({ category, search, sortBy = 'newest', featured = false, pageSize = 12, offset = 0, excludeId } = {}) {
  const where = [], p = []
  if (category) { where.push('category = ?'); p.push(category) }
  if (featured) where.push('featured = 1')
  if (excludeId) { where.push('id <> ?'); p.push(excludeId) }
  if (search) {
    const q = `%${String(search).toLowerCase()}%`
    where.push('(LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(CAST(tags AS CHAR)) LIKE ?)'); p.push(q, q, q)
  }
  const order = {
    price_asc: 'price ASC', price_desc: 'price DESC', popular: 'review_count DESC', oldest: 'created_at ASC', newest: 'created_at DESC',
  }[sortBy] || 'created_at DESC'
  const w = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const size = Math.min(Math.max(Number(pageSize) || 12, 1), 100)
  const off = Math.max(Number(offset) || 0, 0)
  const rows = await query(`SELECT * FROM products ${w} ORDER BY ${order}, id LIMIT ? OFFSET ?`, [...p, size + 1, off])
  const hasMore = rows.length > size
  const products = rows.slice(0, size).map(rowToProduct)
  return { products, lastVisible: off + products.length, hasMore }   // same shape the UI already consumes
}

export const getProductBySlug = async (slug) => rowToProduct(await one('SELECT * FROM products WHERE slug=?', [slug]))
export const getProductById = async (id) => rowToProduct(await one('SELECT * FROM products WHERE id=?', [id]))
export async function getProductsByIds(ids, conn) {
  if (!ids.length) return []
  const [rows] = await (conn || { query: (s, p) => query(s, p).then((r) => [r]) }).query('SELECT * FROM products WHERE id IN (?)', [ids])
  return rows.map(rowToProduct)
}

const J = (v) => JSON.stringify(v ?? null)
function toCols(d) {
  return {
    name: d.name, slug: d.slug || slugify(d.name), description: d.description ?? '',
    price: Number(d.price) || 0, compare_price: d.comparePrice ? Number(d.comparePrice) : null,
    category: d.category ?? null, tags: J(d.tags || []), has_variations: d.hasVariations ? 1 : 0,
    variation_types: J(d.variationTypes || []), variants: J(d.variants || []), default_variant: J(d.defaultVariant || {}),
    stock: Number(d.stock) || 0, sku: d.sku || null, featured: d.featured ? 1 : 0, images: J(d.images || []),
    tax_rate: Number(d.taxRate) || 0, tax_type: d.taxType === 'exclusive' ? 'exclusive' : 'inclusive',
  }
}
export async function createProduct(d) {
  const id = newId(), c = toCols(d), keys = Object.keys(c)
  await query(`INSERT INTO products (id, ${keys.join(',')}) VALUES (?, ${keys.map(() => '?').join(',')})`, [id, ...keys.map((k) => c[k])])
  return id
}
export async function updateProduct(id, d) {
  const c = toCols(d), keys = Object.keys(c)
  await query(`UPDATE products SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`, [...keys.map((k) => c[k]), id])
}
export const deleteProduct = (id) => query('DELETE FROM products WHERE id=?', [id])

/**
 * Atomically change stock inside an existing transaction. Row is locked with FOR UPDATE.
 * delta < 0 => sale (stock down, soldCount up), delta > 0 => return/restock.
 * Mirrors the old /api/orders/confirm and /api/returns/restore-stock logic, minus the race conditions.
 */
export async function applyStockChange(conn, { productId, variantId, qty, sale, strict = false }) {
  const [[row]] = await conn.query('SELECT name, stock, sold_count, variants FROM products WHERE id=? FOR UPDATE', [productId])
  if (!row) return
  const sign = sale ? -1 : 1
  if (sale && strict) {
    // Checked again UNDER the row lock, so two buyers can never both get the last unit.
    const vs = json(row.variants, [])
    const v = variantId ? vs.find((x) => x.id === variantId) : null
    const available = v ? Number(v.stock) || 0 : row.stock
    if (qty > available) throw new HttpError(409, available > 0 ? `Only ${available} left of "${row.name}"` : `"${row.name}" just sold out`)
  }
  const stock = Math.max(0, row.stock + sign * qty)
  const sold = Math.max(0, row.sold_count - sign * qty)
  let variants = json(row.variants, [])
  if (variantId && variants.length) {
    variants = variants.map((v) => (v.id === variantId ? { ...v, stock: Math.max(0, (Number(v.stock) || 0) + sign * qty) } : v))
  }
  await conn.query('UPDATE products SET stock=?, sold_count=?, variants=? WHERE id=?', [stock, sold, J(variants), productId])
}
