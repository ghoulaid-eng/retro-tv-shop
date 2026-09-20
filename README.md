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

## Local setup

Requirements: Node.js 20+, PostgreSQL (Supabase is supported), and optionally a
Stripe test-mode account.

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
- `PUBLIC_URL` — canonical HTTPS origin used for success/cancel redirects

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
- No production admin CRUD/API is exposed.
- Tax calculation, fulfillment labels/tracking, transactional email, refunds,
  and customer order-history pages are not implemented.
- Policy content (privacy, terms, shipping, returns) requires business/legal
  review before launch.
- Live Stripe/PostgreSQL behavior must be exercised in Stripe test mode against
  the deployed database; unit tests intentionally require no credentials.
