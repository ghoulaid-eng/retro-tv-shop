# Sip of Ghoulaid Shop

Sip of Ghoulaid is now a server-backed retro-TV storefront with a protected owner portal, database-backed products/orders/settings, synced customer accounts, and authenticated wishlist/cart/shipping storage.

## Stack

- Node.js + Express
- SQLite (`better-sqlite3`)
- Cookie-based authenticated sessions
- Server-side media uploads stored under `data/uploads/`
- Static storefront/admin UI served by the Node app

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and adjust values:
   ```bash
   cp .env.example .env
   ```
3. Start the app:
   ```bash
   npm start
   ```
4. Open:
   - Storefront: `http://localhost:3000/`
   - Admin: `http://localhost:3000/admin.html`

## Default admin account

On first boot the server seeds an admin account from environment variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

If you do not override them, the local development defaults from `.env.example` are used. Change them before any real deployment.

## Auth flows

The app now supports:

- customer sign up
- sign in / sign out
- password reset token generation
- email verification token generation
- protected admin access

In local development, verification and reset URLs are returned by the API so the flows can be completed without an SMTP provider.

## Data storage

Runtime data is stored in SQLite under `data/shop.db`.
Uploaded media is stored under `data/uploads/`.
These runtime files are gitignored.

## Testing

Run the automated integration tests with:

```bash
npm test
```

## Deployment note

The original GitHub Pages workflow remains in the repository as a legacy static preview path, but the transactional launch-ready app now requires a Node-capable host because authentication, database persistence, uploads, and protected admin APIs run on the server.
