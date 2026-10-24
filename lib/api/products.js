// lib/api/products.js — CLIENT-side replacement for lib/firebase/products.js (same function names/signatures).
// Server components (home page, sitemap) should import from '@/lib/repo/products' directly instead.
const j = async (res) => { if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed'); return res.json() }
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '' && v !== false).map(([k, v]) => [k, v === true ? '1' : String(v)])).toString()

export const getProducts = ({ category = null, search = null, sortBy = 'newest', featured = false, pageSize = 12, lastDoc = null } = {}) =>
  fetch(`/api/products?${qs({ category, search, sortBy, featured, pageSize, offset: lastDoc ?? 0 })}`).then(j)
export const getProductBySlug = (slug) => fetch(`/api/products?slug=${encodeURIComponent(slug)}`).then((r) => (r.status === 404 ? null : j(r).then((d) => d.product)))
export const getProductById = (id) => fetch(`/api/products/${id}`).then((r) => (r.status === 404 ? null : j(r).then((d) => d.product)))
export const getFeaturedProducts = (count = 8) => fetch(`/api/products?${qs({ featured: true, pageSize: count })}`).then(j).then((d) => d.products)
export const getRelatedProducts = (category, excludeId, count = 4) => fetch(`/api/products?${qs({ category, exclude: excludeId, pageSize: count })}`).then(j).then((d) => d.products)
export const createProduct = (data) => fetch('/api/products', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(j).then((d) => d.id)
export const updateProduct = (id, data) => fetch(`/api/products/${id}`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(j)
export const deleteProduct = (id) => fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'same-origin' }).then(j)
