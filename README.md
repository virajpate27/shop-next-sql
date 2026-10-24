# ShopNext: Firebase → Hostinger MySQL migration kit

Drop these files into your repo (paths mirror your project). Nothing here has been run against a live MySQL
server: treat it as a reviewed starting point and test on a staging DB first (Day 2–5 of the plan).

## 1. Install / remove
```bash
npm i mysql2 jose bcryptjs
npm rm firebase firebase-admin          # only AFTER every file below is migrated (Day 6)
```

## 2. Environment variables (Hostinger hPanel → your Node.js app → Environment variables)
```
DB_HOST=localhost            # use the host hPanel shows for the DB; "localhost" only works if app + DB are on the same plan/server
DB_PORT=3306
DB_NAME=...  DB_USER=...  DB_PASSWORD=...
DB_POOL=5
AUTH_SECRET=<openssl rand -hex 32>
GOOGLE_CLIENT_ID=...  NEXT_PUBLIC_GOOGLE_CLIENT_ID=...    # same value; add your prod domain to Authorized JS origins
# Firebase password-hash params (Firebase console → Authentication → ⋮ → Password hash parameters). Needed only for lazy password migration:
FB_SIGNER_KEY=...  FB_SALT_SEPARATOR=...  FB_ROUNDS=8  FB_MEM_COST=14
# unchanged: RAZORPAY_*, CLOUDINARY_*, RESEND_API_KEY, EMAIL_FROM, ADMIN_EMAIL, NEXT_PUBLIC_APP_URL, CRON_SECRET
# REMOVE: every *FIREBASE* variable (after cutover), and NEXT_PUBLIC_CRON_SECRET (see §5)
```

## 3. What's in the kit
| File | Replaces |
|---|---|
| `db/schema.sql` | Firestore collections |
| `lib/db.js` | `lib/firebase/config.js`, `admin.js` |
| `lib/auth/{session,password,guards}.js` | `verifyAuth.js` + Firebase Auth (same `withAuth` / `withAdmin` API) |
| `app/api/auth/*`, `app/(auth)/reset-password` | Firebase Auth (register, login, logout, me, Google, forgot/reset) |
| `lib/auth/client.js` | `lib/firebase/auth.js` (same export names) |
| `lib/authFetch.js`, `context/AuthContext.js`, `middleware.js` | token-based versions |
| `lib/shipping.js`, `lib/coupons.js` | pure functions pulled out of the Firestore files |
| `lib/repo/*`, `app/api/products/*`, `lib/api/products.js` | `lib/firebase/products.js` |
| `app/api/orders/*`, `lib/api/orders.js` | `lib/firebase/orders.js`, `/api/orders/confirm`, `/api/coupons/use` |
| `app/api/razorpay/{create-order,verify}` | same routes, now tied to the DB order |
| `app/api/coupons-validate.route.js` | save as `app/api/coupons/validate/route.js` |
| `hooks/usePolling.js`, `utils/ts.js` | `onSnapshot`, `Timestamp.toDate()` |
| `scripts/migrate-firestore-to-mysql.mjs` | one-off, idempotent data copy + reconciliation |

## 4. Files still to convert (same pattern: one route + one thin client function with the OLD name)
| Old module (`lib/firebase/…`) | New endpoints | Used by |
|---|---|---|
| `categories.js` | `GET/POST /api/categories`, `PUT/DELETE /api/categories/[id]` (admin writes) | `useCategories`, home, admin/categories |
| `coupons.js` | admin CRUD `/api/coupons`, `/api/coupons/[id]` (`usedCount` is NEVER client-writable) | admin/coupons |
| `addresses.js` | `GET/POST /api/addresses`, `PUT/DELETE /api/addresses/[id]` (always `WHERE user_id = auth.uid`) | checkout, profile |
| `wishlist.js` | `POST/DELETE /api/wishlist/[productId]` | `useWishlist` |
| `reviews.js` | `GET/POST /api/reviews`, `POST /api/reviews/[id]/helpful`; recompute rating in the same tx | ReviewSection |
| `returns.js` | `POST /api/returns`, `GET /api/returns` (mine / `?orderId=` / admin all), `PATCH /api/returns/[id]` (admin: status + restock via `applyStockChange(..., sale:false)` in ONE tx) | order page, admin/returns |
| `shipping.js` | `GET /api/settings/shipping` (public), `PUT` (admin) → `settings` table | `useShipping`, admin/shipping |
| `customers.js` | `GET /api/admin/customers` using `LEFT JOIN orders … GROUP BY` (replaces the "load every order" approach) | admin/customers |
| `store/cartStore.js` | `GET/PUT /api/cart` against `carts` | `useCartSync` |
| `app/sitemap.js`, `(shop)/page.js` (server code) | import `@/lib/repo/*` directly: no HTTP hop | SEO |
| `api/email/low-stock` | `SELECT … FROM products WHERE stock <= 10` | cron |

Realtime → polling: `orders/[id]` every 5–10 s, admin pages every 15 s, via `usePolling`.
Replace the 15 `v?.toDate ? v.toDate().getTime() : 0` occurrences with `toMs(v)` from `utils/ts.js`.

## 5. Checkout page changes (`app/(shop)/checkout/page.js`)
```diff
- import { createOrder, updateOrderPayment } from "@/lib/firebase/orders";
- import { getAddresses, addAddress } from "@/lib/firebase/addresses";
+ import { createOrder } from "@/lib/api/orders";
+ import { getAddresses, addAddress } from "@/lib/api/addresses";

- const orderId = await createOrder(baseOrderData);
+ const orderId = await createOrder({
+   items: items.map(i => ({ productId: i.productId, variantId: i.variantId || null, quantity: i.quantity,
+                            variantLabel: i.variantLabel || null, selectedOptions: i.selectedOptions || null })),
+   addressId: selectedAddress.id, paymentMethod, couponCode: coupon?.code || null,
+ });
  // COD branch: DELETE the /api/orders/confirm and /api/coupons/use calls (done inside createOrder's transaction)
  // Razorpay branch:
- const rzpOrder = await createRazorpayOrder(total, orderId);
+ const rzpOrder = await createRazorpayOrder(orderId);        // lib/razorpay.js: send { orderId } instead of { amount, receipt }
  ...
  const verification = await verifyRazorpayPayment(paymentResponse);   // unchanged call; server now confirms the order
- await updateOrderPayment(...); await fetch("/api/orders/confirm" ...); fetch("/api/coupons/use" ...)   // DELETE all three
```
Emails (`triggerEmail`) keep working unchanged.

## 6. Bugs/risks found in the current code (fixed by this design)
1. **Razorpay path never decrements stock or counts coupons**: lines 315–327 use plain `fetch` without the auth header, so `withAuth` returns 401. Fixed: stock + coupon happen inside `/api/razorpay/verify`.
2. **Order totals are computed in the browser and written straight to Firestore**: a customer can edit price/total. Fixed: `POST /api/orders` rebuilds everything from DB prices.
3. **Razorpay verify isn't tied to an order**; a valid signature from any payment passes. Fixed: matched to `orders.razorpay_order_id` + user, idempotent.
4. **`NEXT_PUBLIC_CRON_SECRET`** (admin dashboard) ships your cron secret to every browser. Move the button to an admin-only route that checks the session.
5. **`middleware.js` redirect for protected routes is commented out.** Re-enabled.
6. **`/api/email/send` lets any logged-in user email any address** with your sender. Restrict `to` to the caller's own email, or make admin/system emails server-side only.
7. Coupon `maxUses` check was non-atomic. Now a conditional `UPDATE`.
