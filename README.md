# Sip of Ghoulaid Shop

A retro TV-themed storefront with a browser-local account, wishlist, cart, and
demo admin experience, plus an optional production commerce service built with
Node.js, Express, Prisma/PostgreSQL, and Stripe Checkout.

## What runs where

- `node server.js` serves the existing frontend and same-origin JSON APIs.
- PostgreSQL is the source of truth for the hosted catalog, inventory, checkout
  orders, payments, webhook idempotency, and custom-order requests.
- Stripe hosts card collection. This application never receives or stores raw
  card details.
- Browser storage remains available for account, wishlist, cart, and demo admin
  behavior. If the backend cannot be reached, the UI explicitly identifies
  checkout and custom requests as browser-local and does not claim submission.
- `admin.html` is deliberately **local-only and unauthenticated**. It cannot
  mutate production data. A production admin API must be added only with
  server-side authentication and authorization; there is no hardcoded password.
  Its product editor supports local gallery images, URL handles, formatted
  descriptions, sale pricing, stock fields, shipping details, categories, and
  per-variant prices and quantities for storefront prototyping.

## Local setup

Requirements: Node.js 20+, PostgreSQL (Supabase is supported), and optionally a
Stripe test-mode account.

To refresh the browser-local catalog and download public product images from the
existing Big Cartel storefront:

```text
npm run import:catalog
```

The importer replaces `products.json` and `assets/products/` with the current
public listings from `www.sipofghoulaid.com`. Public storefront inventory does
not expose exact quantities, so imported products remain locally unlimited
unless quantities are entered manually in the local admin editor.

```text
copy .env.example .env
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm start
```

Open `http://localhost:3000`. `npm run dev` starts Node's watch mode.

Use `npm run db:migrate -- --name <change>` while developing schema changes.
Use `npm run db:deploy` in deployment environments; do not run the interactive
development migration command in production. `npm run check` runs the
credential-free Node tests. `npm run check:database` additionally generates and
validates Prisma and therefore requires `DATABASE_URL` and `DIRECT_URL`.

The seed is idempotent and imports `products.json`. New variant inventory uses
`SEED_INVENTORY_DEFAULT` (25 by default); review real stock before launch.

## Supabase/PostgreSQL

Set `DATABASE_URL` only in the server's secret manager. For Supabase, the pooled
transaction URL is appropriate for runtime traffic (include its required
`pgbouncer=true` parameter). Set `DIRECT_URL` to Supabase's direct/session URL;
Prisma uses it for migrations while the application continues using the pooled
runtime URL. Supabase may require `sslmode=require`. Never place either URL or a
Supabase service-role key in frontend JavaScript.

Typical deployment:

```text
npm ci
npm run db:generate
npm run db:deploy
npm start
```

`POST /api/custom-orders` depends only on `DATABASE_URL`, not Stripe. With no
database configured it returns HTTP 503 rather than a fake success response.

## Stripe setup

Create one or more Stripe Shipping Rates and configure:

- `STRIPE_SECRET_KEY` — server-side secret key
- `STRIPE_WEBHOOK_SECRET` — signing secret for this endpoint
- `STRIPE_SHIPPING_RATE_IDS` — comma-separated `shr_...` IDs
- `STRIPE_ALLOWED_SHIPPING_COUNTRIES` — comma-separated two-letter codes
- `STRIPE_AUTOMATIC_TAX_ENABLED` — keep `true` after activating Stripe Tax
- `STRIPE_DEFAULT_TAX_CODE` — defaults to General Tangible Goods (`txcd_99999999`)
- `FREE_SHIPPING_THRESHOLD_CENTS` — server-enforced threshold (`5000` for $50)
- `LOCAL_PICKUP_ENABLED` — offers a free local-pickup option
- `LOCAL_PICKUP_NAME` — customer-facing pickup label
- `PUBLIC_URL` — canonical HTTPS origin used for success/cancel redirects

Checkout always recalculates the subtotal from database prices. Orders at or above the
configured threshold receive free USPS standard shipping. Local pickup is free at every
subtotal. Stripe Checkout collects a US address and calculates tax automatically from
the customer address after Stripe Tax registrations are configured.

Register this HTTPS webhook:

```text
https://YOUR_DOMAIN/api/commerce/webhook
```

Subscribe at minimum to:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

For local testing, use Stripe CLI forwarding:

```text
stripe listen --forward-to localhost:3000/api/commerce/webhook
```

## Render deployment

`render.yaml` defines a free-tier test web service. Its build runs `npm ci`,
generates Prisma Client, applies pending migrations, and seeds the catalog
idempotently. Its runtime start command only launches the server, so cold boots and
restarts do not run database migrations or seed the catalog. The app automatically
uses Render's `RENDER_EXTERNAL_URL` for Stripe success and cancel redirects.

Create the service as a Render Blueprint, then enter every `sync: false` environment
variable in the Render dashboard. Use the Supabase pooled transaction URL for
`DATABASE_URL` and the direct port 5432 URL for `DIRECT_URL`. For a catalog refresh
outside a deployment, run `npm run db:seed` once from a controlled environment after
reviewing the source catalog; do not add it to the runtime start command. The seed
defaults new inventory to zero so exact quantities must be entered before checkout is
enabled.

The free tier is suitable for integration testing but sleeps when idle. Upgrade the
service before treating it as always-on production hosting.

Checkout prices, variants, and stock are loaded from PostgreSQL; browser prices
are never trusted. Inventory is reserved in a serializable transaction when a
Checkout Session is created. A signed paid event transactionally marks the
payment/order paid and decrements quantity plus reserved stock exactly once.
Expired/failed sessions release reservations through webhooks and a periodic
cleanup pass. Stripe event IDs are persisted for idempotency.

## API overview

- `GET /api/health` — process/database readiness, without secrets
- `GET /api/commerce/config` — safe capability flags only
- `GET /api/catalog` — active hosted products and available variants
- `POST /api/commerce/checkout-sessions` — validated server-priced cart
- `POST /api/commerce/webhook` — raw-body, signature-verified Stripe events
- `POST /api/custom-orders` — validated hosted request persistence

The service applies security headers, request size limits, write/API rate
limits, same-origin static serving, validation, and generic production errors.
Only an explicit allowlist of frontend files is served.

## Deployment and GitHub Pages

GitHub Pages can host only the static frontend; it **cannot run Express, access
PostgreSQL, keep Stripe secrets, or receive secure webhooks**. The Pages workflow
therefore publishes only browser files and operates in clearly labeled fallback
mode. Production commerce requires a Node-capable HTTPS host with persistent
environment secrets. For a single deployment, host both frontend and backend
from `server.js` so `/api` remains same-origin.

Set `TRUST_PROXY=true` only when the application is behind a trusted reverse
proxy. Do not commit `.env`; `.env.example` contains placeholders only.

## Current boundaries

- Customer accounts, wishlists, and carts are device-local, not authenticated
  cloud accounts.
- Production administration requires Supabase Auth, the server-side email
  allowlist, and the hosted database; static-only deployments remain demo-only.
- Tax calculation, fulfillment-label purchasing, and customer order-history
  pages are not implemented.
- Policy content (privacy, terms, shipping, returns) requires business/legal
  review before launch.
- Live Stripe/PostgreSQL behavior must be exercised in Stripe test mode against
  the deployed database; unit tests intentionally require no credentials.

## Order operations

Production order operations are available to authenticated, allowlisted admins:

- Payment confirmation and order-status emails through Resend.
- Processing, shipping, carrier/tracking, and delivery updates.
- Cancellation with an auditable reason.
- Full or partial Stripe refunds using the stored PaymentIntent.
- Internal support notes and customer order-support requests.
- Persistent order timeline and email-delivery records.

Before deployment, run `npm run db:deploy` and configure:

```env
RESEND_API_KEY="re_..."
ORDER_EMAIL_FROM="Sip of Ghoulaid <orders@sipofghoulaid.com>"
SUPPORT_EMAIL="support@sipofghoulaid.com"
```

The From address must use a domain verified in Resend. Refunds require
`STRIPE_SECRET_KEY`; order-operation buttons are available only after signing
into the production Admin Portal with a Supabase account listed in
`ADMIN_EMAIL_ALLOWLIST`. Customer support requests intentionally return the same
response whether or not an order matches, preventing order-email enumeration.
