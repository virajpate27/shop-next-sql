import { NextResponse } from 'next/server'
import { query, one, tx, newId } from '@/lib/db'
import { withAuth, HttpError } from '@/lib/auth/guards'
import { getProductsByIds, applyStockChange } from '@/lib/repo/products'
import { findValidCoupon, consumeCoupon } from '@/lib/repo/coupons'
import { getShippingConfigServer } from '@/lib/repo/shippingConfig'
import { rowToOrder, event } from '@/lib/repo/orders'
import { calculateDiscount } from '@/lib/coupons'
import { calculateShipping } from '@/lib/shipping'
import { calculateCartTax, getTaxBreakdown } from '@/utils/tax'

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

/**
 * POST /api/orders  — the server is the source of truth for prices, tax, shipping, discount and total.
 * Client sends only: items[{productId, variantId?, quantity, variantLabel?, selectedOptions?}],
 *                    addressId | shippingAddress, paymentMethod ('cod'|'razorpay'), couponCode?
 */
export const POST = withAuth(async (req, _ctx, auth) => {
  const body = await req.json().catch(() => ({}))
  const { items, addressId, paymentMethod, couponCode } = body
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Cart is empty')
  if (!['cod', 'razorpay'].includes(paymentMethod)) throw new HttpError(400, 'Invalid payment method')

  let shippingAddress = body.shippingAddress
  if (addressId) {
    const a = await one('SELECT id, data FROM addresses WHERE id=? AND user_id=?', [addressId, auth.uid])
    if (!a) throw new HttpError(400, 'Address not found')
    shippingAddress = { ...(typeof a.data === 'string' ? JSON.parse(a.data) : a.data), id: a.id }
  }
  if (!shippingAddress) throw new HttpError(400, 'Delivery address required')

  const result = await tx(async (conn) => {
    const products = await getProductsByIds([...new Set(items.map((i) => i.productId))], conn)
    const byId = Object.fromEntries(products.map((p) => [p.id, p]))

    // 1. Rebuild every line from DB prices (never trust client price/tax)
    const lines = items.map((i) => {
      const p = byId[i.productId]
      const qty = Math.max(1, Math.floor(Number(i.quantity) || 1))
      if (!p) throw new HttpError(400, 'A product in your cart is no longer available')
      let price = p.price, available = p.stock
      if (i.variantId) {
        const v = (p.variants || []).find((x) => x.id === i.variantId)
        if (!v) throw new HttpError(400, `Selected option for "${p.name}" is no longer available`)
        price = Number(v.price) || p.price; available = Number(v.stock) || 0
      }
      if (qty > available) throw new HttpError(409, available > 0 ? `Only ${available} left of "${p.name}"` : `"${p.name}" is out of stock`)
      return {
        productId: p.id, name: p.name, variantId: i.variantId || null, variantLabel: i.variantLabel || null,
        selectedOptions: i.selectedOptions || null, price, image: p.images?.[0] || null, quantity: qty,
        taxRate: p.taxRate || 0, taxType: p.taxType || 'inclusive', category: p.category,
      }
    })

    // 2. Tax → coupon → shipping → total (same formulas the checkout page used)
    const { subtotalBeforeTax, totalTaxAmount, totalAmount: cartTotal } = calculateCartTax(lines)
    let coupon = null, discount = 0
    if (couponCode) {
      const v = await findValidCoupon(couponCode, cartTotal, conn)
      if (!v.valid) throw new HttpError(400, v.error)
      coupon = v.coupon; discount = r2(calculateDiscount(coupon, cartTotal))
    }
    const cfg = await getShippingConfigServer(conn)
    const ship = calculateShipping(cartTotal, paymentMethod, lines, cfg)
    const freeShip = ship.shippingFree || coupon?.discountType === 'free_shipping'
    const shipping = freeShip ? 0 : ship.shippingCharge
    const total = r2(Math.max(0, cartTotal - discount + shipping + ship.codCharge))

    // 3. Persist
    const isCod = paymentMethod === 'cod'
    const status = isCod ? 'confirmed' : 'pending'
    const id = newId()
    await conn.query(
      `INSERT INTO orders (id,user_id,status,payment_method,subtotal,total_tax,shipping,cod_fee,discount,total,
         coupon_id,coupon_code,coupon_type,customer_email,items,tax_breakdown,shipping_address,timeline)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, auth.uid, status, paymentMethod, subtotalBeforeTax, totalTaxAmount, shipping, ship.codCharge, discount, total,
        coupon?.id || null, coupon?.code || null, coupon?.discountType || null, auth.email,
        JSON.stringify(lines.map(({ category, ...l }) => l)), JSON.stringify(getTaxBreakdown(lines)), JSON.stringify(shippingAddress),
        `[${event(status, isCod ? 'Order placed with Cash on Delivery' : 'Order placed successfully')}]`])

    // COD is final now → take stock + coupon use in the same transaction. Razorpay does this on payment verify.
    if (isCod) {
      for (const l of lines) await applyStockChange(conn, { productId: l.productId, variantId: l.variantId, qty: l.quantity, sale: true })
      if (coupon && !(await consumeCoupon(conn, coupon.id))) throw new HttpError(409, 'This coupon has reached its usage limit')
    }
    return { id, total, status }
  })
  return NextResponse.json({ orderId: result.id, total: result.total, status: result.status }, { status: 201 })
})

// GET /api/orders            → my orders
// GET /api/orders?all=1      → all orders (admin)   [admin dashboard / orders page / customers]
// GET /api/orders?userId=X   → one customer's orders (admin)
export const GET = withAuth(async (req, _ctx, auth) => {
  const sp = new URL(req.url).searchParams
  const admin = auth.role === 'admin'
  let rows
  if (sp.get('all') === '1' || sp.get('userId')) {
    if (!admin) throw new HttpError(403, 'Access denied — admin only')
    rows = sp.get('userId')
      ? await query('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', [sp.get('userId')])
      : await query('SELECT * FROM orders ORDER BY created_at DESC')
  } else {
    rows = await query('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', [auth.uid])
  }
  return NextResponse.json({ orders: rows.map(rowToOrder) })
})
