# ShopNext — Next.js + MySQL (Hostinger) + Cloudinary

Firebase has been fully removed. Data lives in MySQL, auth is a signed `httpOnly` session cookie, images stay on Cloudinary,
payments on Razorpay, email on Resend.

## 1. Run locally
```bash
npm install                       # also generates package-lock.json: COMMIT IT
cp .env.example .env.local        # fill in values
docker run -d --name shopdb -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=shop -p 3306:3306 mysql:8
mysql -h127.0.0.1 -uroot -proot shop < db/schema.sql
npm run dev
```
Make yourself admin: register in the UI, then `UPDATE users SET role='admin' WHERE email='you@example.com';`

## 2. Move existing Firebase data (one-off)
See `migration/`. It is **not** deployed with the app.
```bash
cd migration && npm install
cp .env.migration.example .env.migration      # Firebase admin key + MySQL target
firebase auth:export users-auth-export.json --format=JSON   # optional: keeps customers' passwords
npm run dry-run && npm run migrate            # prints Firestore-vs-MySQL counts; every line should say OK
```
Re-running is safe (upserts) but **overwrites** MySQL rows with Firestore values: only re-run before go-live, during the freeze window.
Legacy passwords: set `FB_*` env vars (see `.env.example`). Verify with one real account; if it fails, users just use "Forgot password".

## 3. Deploy on Hostinger (Business plan)
1. hPanel → **Databases → MySQL Databases**: create DB + user. Import `db/schema.sql` via phpMyAdmin.
2. Push this repo to a private GitHub repo.
3. hPanel → **Websites → Add Website → Node.js Web App** → connect GitHub → pick branch. Framework: Next.js, Node 20.9+ (22 recommended), build script `build`, output `.next`.
4. Add every variable from `.env.example` **before the first deploy** (`NEXT_PUBLIC_*` are baked in at build time; rebuild after changing them). `DB_HOST=localhost`.
5. Deploy, attach domain, confirm HTTPS (session cookie is `secure` in production).
6. Third parties: add the domain to Google OAuth *Authorized JavaScript origins*; verify your Resend sending domain; use live Razorpay keys.
7. Cron (hPanel → Cron Jobs): `curl -s -H "x-cron-secret: $CRON_SECRET" https://yourdomain.com/api/email/low-stock` daily.
8. Backups: schedule `mysqldump` and keep copies off the server.

## 4. Smoke test after every deploy
register/login/logout · Google login · password reset email · browse/search · COD order (stock drops) ·
Razorpay test payment (order → confirmed, stock drops, coupon counted) · cancel payment · admin status change shows on customer order page ·
return → approve → refund (stock restored once) · `/admin` while logged out redirects.

## 5. Architecture notes
- **Server is the source of truth for money.** `POST /api/orders` rebuilds prices/tax/shipping/discount from the DB; Razorpay amount comes from the order row; `/api/razorpay/verify` confirms the order, decrements stock and counts the coupon in one transaction (idempotent).
- Stock is re-checked under a row lock for COD, so two buyers cannot take the last unit.
- Live updates are polling (order page 8s, admin 15–20s), not WebSockets.
- Rate limits (login, register, reset, email) are in-memory: correct for one Node process, which is how Hostinger runs it.
- API responses keep the old Firestore field names (`createdAt`, `userId`, …); dates are ISO strings.

## 6. Known limitations
- Abandoned Razorpay checkouts leave `pending` orders (same as before). Add a cleanup cron if it bothers you.
- Cancelling an order in admin does not restock (same as before).
- `package-lock.json` was removed because it still referenced Firebase: run `npm install` once and commit the new one.
- Not run against a live MySQL/Hostinger instance. Test on a staging DB first.
