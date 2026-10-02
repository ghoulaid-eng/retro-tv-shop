# Sip of Ghoulaid

Retro-TV storefront with a real, server-side Stripe Checkout integration. The original browser-local catalog/admin behavior remains available for visual demos. Payments are **only** enabled through the Node service below; the browser never receives Stripe secret keys or calculates an authoritative price.

## Commerce architecture

- `server.js` serves the static site and creates Stripe Checkout Sessions from PostgreSQL products only.
- Prisma/PostgreSQL holds products, product options, sellable variants, per-variant inventory/reservations, immutable order-line product/variant/option/price snapshots, and order status. Product-level price and inventory remain only as legacy compatibility fields.
- Checkout creation locks the requested authoritative product-variant rows in a serializable transaction and reserves that variant's inventory. Inventory quantity is decremented only by a verified Stripe payment webhook.
- Browser catalog entries use `variants` with `{ id, name, price, stock, options }`. Products without a `variants` array are safely treated as a single `product-id-default` variant, preserving existing local catalogs.
- `/api/commerce/webhook` receives the raw request body and verifies Stripe's signature before it changes an order or inventory.
- Stripe Checkout collects the required shipping address and uses shipping-rate IDs configured in environment variables. Card data goes directly to Stripe; this application does not handle it.

## Run locally

Install Node.js 20+ and PostgreSQL, create a database, then set secrets in your shell or deployment environment (never commit them):

```powershell
npm install
$env:DATABASE_URL = "postgresql://USER:PASSWORD@localhost:5432/sip_of_ghoulaid?schema=public"
$env:STRIPE_SECRET_KEY = "sk_test_..."
$env:STRIPE_WEBHOOK_SECRET = "whsec_..."
$env:STRIPE_SHIPPING_RATE_IDS = "shr_..."
$env:STRIPE_ALLOWED_SHIPPING_COUNTRIES = "US"
$env:PUBLIC_URL = "http://localhost:4242"
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm start
```

Create shipping rates in the Stripe Dashboard and place their comma-separated `shr_...` IDs in `STRIPE_SHIPPING_RATE_IDS`. `STRIPE_ALLOWED_SHIPPING_COUNTRIES` is a comma-separated ISO country list. See `.env.example` for every non-secret configuration key and safe placeholder values.

For local webhook forwarding, use Stripe CLI in another terminal:

```powershell
stripe listen --forward-to localhost:4242/api/commerce/webhook
```

Set its printed `whsec_...` value as `STRIPE_WEBHOOK_SECRET`. The checkout session expires after `CHECKOUT_RESERVATION_MINUTES` (default 30; 30–1440), and its expiration webhook releases reserved stock.

If those integration variables are absent—or when the legacy `server.ps1` is used—the checkout button explicitly stays in local demo mode and preserves the existing local demo-order behavior. No payment is attempted.

## Deploy

1. Provision a managed PostgreSQL database and set `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SHIPPING_RATE_IDS`, `STRIPE_ALLOWED_SHIPPING_COUNTRIES`, and the public HTTPS `PUBLIC_URL` in the host's secret/environment settings.
2. On Render, create a Blueprint from this repository so `render.yaml` configures the build (`npm install && npm run db:generate`), `npm start`, and `/health` check. The site can start in safe demo mode before the database and Stripe settings exist. Set every `sync: false` variable in Render's Environment settings when the corresponding integration is ready; Render supplies `PORT` automatically. Set a long unique `OWNER_PORTAL_PASSWORD` and an `OWNER_PORTAL_USERNAME` to enable `/admin.html`; otherwise the owner portal returns 404. When enabled, the portal uses server-enforced HTTPS Basic Auth, not the browser-local demo credentials.
3. After adding `DATABASE_URL`, run `npm run db:deploy` and `npm run db:seed` once from a secure deployment shell or CI job to initialize the supplied product IDs and usable variants. For another host, build/deploy with `npm ci`, `npm run db:generate`, `npm run db:deploy`, and `npm start`.
4. Register `https://YOUR_DOMAIN/api/commerce/webhook` in Stripe for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`.
5. Use HTTPS, managed database backups, least-privilege database credentials, and your hosting provider's secret manager. Do not expose `.env`, Stripe secret keys, webhook secrets, or database credentials.

The provided seed inventory is intentionally conservative and includes variants for testing option selection. Update PostgreSQL `ProductVariant` records—not browser `localStorage`—for live prices, availability, and sellable inventory. The owner portal's product and variant editor remains browser-local until an authenticated admin API exists.

## Supabase database setup

Supabase can be the managed PostgreSQL host for this service. Create a Supabase project, then get its **Database connection URI** from **Project Settings → Database → Connection string → URI**. Put that URI in the deployment environment as `DATABASE_URL`; do not commit it. For a serverless deployment, use the Supavisor pooler URI and append `?pgbouncer=true&connection_limit=1`.

Run `npm run db:generate` and `npm run db:deploy` against that database to create products, variants, Stripe orders, and `CustomOrderRequest` records. The `CustomOrderRequest` table is ready for hosted custom-form data and owner review; its Prisma migration is `20260915161500_add_custom_order_requests`. When the Express service has `DATABASE_URL`, the storefront sends Formspree-accepted custom requests to `POST /api/custom-orders` for persistent hosted storage.

The project URL, publishable/anonymous key, and especially the Supabase service-role key do **not** belong in browser source. This server uses the database URL as a server-side secret. Before enabling browser access to Supabase APIs directly, define Row Level Security policies and an authenticated owner role.

## Deployment verification still required

This repository has **not** been verified against a deployed Stripe account and PostgreSQL database. Before launch, deploy the migration, seed/test variants, complete a Stripe test-mode checkout for each relevant variant, confirm webhook-driven reservation release and inventory decrement, and verify the production HTTPS webhook endpoint. Do not add Stripe credentials to this repository.
