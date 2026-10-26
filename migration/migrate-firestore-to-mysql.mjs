// scripts/migrate-firestore-to-mysql.mjs
// Usage:
//   node --env-file=.env.migration scripts/migrate-firestore-to-mysql.mjs [--dry-run]
// Env (.env.migration — NEVER commit):
//   FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
//   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
//   AUTH_EXPORT=./users-auth-export.json   (optional; from: firebase auth:export users-auth-export.json --format=JSON)
// Idempotent: uses upsert, safe to re-run (do a final re-run during the cutover freeze window).
import fs from 'node:fs'
import mysql from 'mysql2/promise'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const DRY = process.argv.includes('--dry-run')
initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n') }) })
const fs_ = getFirestore()
const db = DRY ? null : await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4', timezone: 'Z' })

const date = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null)
const J = (v) => JSON.stringify(v ?? null)
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)
const stats = {}

async function upsert(table, row) {
  stats[table] = (stats[table] || 0) + 1
  if (DRY) return
  const cols = Object.keys(row)
  const keyCols = ['id', 'key']
  const upd = cols.filter((c) => !keyCols.includes(c) && !(table === 'wishlist')).map((c) => `\`${c}\`=VALUES(\`${c}\`)`)
  const tail = upd.length ? upd.join(',') : `\`${cols[0]}\`=\`${cols[0]}\``   // no-op update (wishlist)
  await db.query(
    `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${tail}`,
    cols.map((c) => row[c]))
}
const all = async (name) => (await fs_.collection(name).get()).docs.map((d) => ({ id: d.id, ...d.data() }))

// ── users (+ password hashes from Auth export) ────────────────────────────
const authUsers = process.env.AUTH_EXPORT ? JSON.parse(fs.readFileSync(process.env.AUTH_EXPORT, 'utf8')).users || [] : []
const authById = Object.fromEntries(authUsers.map((u) => [u.localId, u]))
const users = await all('users')
const seenEmail = new Set()
const merged = [...users]
for (const a of authUsers) if (!users.find((u) => u.id === a.localId)) merged.push({ id: a.localId, email: a.email, displayName: a.displayName, photoURL: a.photoUrl, role: 'customer' })

for (const u of merged) {
  const a = authById[u.id] || {}
  const email = String(u.email || a.email || '').toLowerCase().trim()
  if (!email) { console.warn('skip user without email', u.id); continue }
  if (seenEmail.has(email)) { console.warn('duplicate email skipped', email, u.id); continue }
  seenEmail.add(email)
  const googleSub = a.providerUserInfo?.find((p) => p.providerId === 'google.com')?.rawId || null
  await upsert('users', {
    id: u.id, email, display_name: u.displayName || a.displayName || null, photo_url: u.photoURL || a.photoUrl || null,
    fb_hash: a.passwordHash || null, fb_salt: a.salt || null, google_sub: googleSub,
    role: u.role === 'admin' ? 'admin' : 'customer', blocked: u.blocked ? 1 : 0,
    created_at: date(u.createdAt) || new Date(), updated_at: date(u.updatedAt) || new Date() })
  for (const addr of u.addresses || []) {
    const { id, ...rest } = addr
    await upsert('addresses', { id: id || `addr_${u.id}_${Math.random().toString(36).slice(2, 8)}`, user_id: u.id, data: J(rest) })
  }
  for (const pid of u.wishlist || []) await upsert('wishlist', { user_id: u.id, product_id: pid })
}

// ── categories ─────────────────────────────────────────────────────────────
for (const c of await all('categories')) {
  const { id, name, slug, createdAt, updatedAt, ...rest } = c
  await upsert('categories', { id, name, slug: slug || String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-'), data: J(rest), created_at: date(createdAt) || new Date() })
}

// ── products ───────────────────────────────────────────────────────────────
for (const p of await all('products')) {
  await upsert('products', {
    id: p.id, name: p.name, slug: p.slug || p.id, description: p.description || '', price: num(p.price),
    compare_price: p.comparePrice ? num(p.comparePrice) : null, category: p.category ?? null, tags: J(p.tags || []),
    has_variations: p.hasVariations ? 1 : 0, variation_types: J(p.variationTypes || []), variants: J(p.variants || []),
    default_variant: J(p.defaultVariant || {}), stock: Math.trunc(num(p.stock)), sku: p.sku || null, featured: p.featured ? 1 : 0,
    images: J(p.images || []), tax_rate: num(p.taxRate), tax_type: p.taxType === 'exclusive' ? 'exclusive' : 'inclusive',
    rating: num(p.rating), review_count: Math.trunc(num(p.reviewCount)), sold_count: Math.trunc(num(p.soldCount)),
    created_at: date(p.createdAt) || new Date(), updated_at: date(p.updatedAt) || new Date() })
}

// ── coupons ────────────────────────────────────────────────────────────────
for (const c of await all('coupons')) {
  await upsert('coupons', {
    id: c.id, code: String(c.code).toUpperCase().trim(), description: c.description || null, discount_type: c.discountType,
    discount_value: num(c.discountValue), max_discount: num(c.maxDiscount), min_order: num(c.minOrder),
    max_uses: Math.trunc(num(c.maxUses)), used_count: Math.trunc(num(c.usedCount)), expires_at: date(c.expiresAt),
    is_active: c.isActive === false ? 0 : 1, created_at: date(c.createdAt) || new Date(), updated_at: date(c.updatedAt) || new Date() })
}

// ── orders ─────────────────────────────────────────────────────────────────
for (const o of await all('orders')) {
  const created = date(o.createdAt) || new Date()
  await upsert('orders', {
    id: o.id, user_id: o.userId || '', status: o.status || 'pending', payment_method: o.paymentMethod || 'cod',
    subtotal: num(o.subtotal), total_tax: num(o.totalTax), shipping: num(o.shipping), cod_fee: num(o.codFee),
    discount: num(o.discount), total: num(o.total), coupon_id: o.couponId || null, coupon_code: o.couponCode || null,
    coupon_type: o.couponType || null, razorpay_order_id: o.razorpayOrderId || null, razorpay_payment_id: o.razorpayPaymentId || null,
    customer_email: o.customerEmail || null, items: J(o.items || []), tax_breakdown: J(o.taxBreakdown || []),
    shipping_address: J(o.shippingAddress || null),
    timeline: J(o.timeline?.length ? o.timeline : [{ status: o.status || 'pending', timestamp: created.toISOString(), note: 'Order placed' }]),
    created_at: created, updated_at: date(o.updatedAt) || created })
}

// ── returns / reviews ──────────────────────────────────────────────────────
for (const r of await all('returns')) {
  await upsert('returns', {
    id: r.id, order_id: r.orderId, user_id: r.userId || '', customer_email: r.customerEmail || null, status: r.status || 'pending',
    reason: r.reason || null, custom_note: r.customNote || null, admin_note: r.adminNote || null, refund_amount: num(r.refundAmount),
    payment_method: r.paymentMethod || null, items: J(r.items || []), resolved_at: date(r.resolvedAt),
    created_at: date(r.createdAt) || new Date(), updated_at: date(r.updatedAt) || new Date() })
}
for (const r of await all('reviews')) {
  await upsert('reviews', {
    id: r.id, product_id: r.productId, user_id: r.userId, display_name: r.displayName || null, rating: Math.trunc(num(r.rating, 5)),
    comment: r.comment || null, helpful: Math.trunc(num(r.helpful)), created_at: date(r.createdAt) || new Date() })
}

// ── settings/shipping ──────────────────────────────────────────────────────
const ship = await fs_.doc('settings/shipping').get()
if (ship.exists) { const { updatedAt, ...cfg } = ship.data(); await upsert('settings', { key: 'shipping', value: J(cfg) }) }

console.log(DRY ? 'DRY RUN — would write:' : 'Migrated:', stats)
if (!DRY) {
  // Reconciliation: compare Firestore counts with MySQL counts
  for (const [fsName, table] of [['users', 'users'], ['products', 'products'], ['orders', 'orders'], ['coupons', 'coupons'], ['returns', 'returns'], ['reviews', 'reviews'], ['categories', 'categories']]) {
    const f = (await fs_.collection(fsName).count().get()).data().count
    const [[{ n }]] = await db.query(`SELECT COUNT(*) n FROM \`${table}\``)
    console.log(`${table.padEnd(11)} firestore=${f} mysql=${n} ${f === n ? 'OK' : '<-- CHECK'}`)
  }
  const [[s]] = await db.query('SELECT ROUND(SUM(total),2) t FROM orders'); console.log('orders SUM(total) in MySQL:', s.t, '(compare with Firestore sum)')
  await db.end()
}
