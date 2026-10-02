const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const Stripe = require('stripe');
const { PrismaClient, OrderStatus, Prisma } = require('@prisma/client');

const app = express();
const root = __dirname;
const port = Number(process.env.PORT || 4242);
const publicUrl = (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, '');
const reservationMinutes = Math.min(Math.max(Number(process.env.CHECKOUT_RESERVATION_MINUTES || 30), 30), 1440);
const shippingRateIds = (process.env.STRIPE_SHIPPING_RATE_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
const shippingCountries = (process.env.STRIPE_ALLOWED_SHIPPING_COUNTRIES || 'US').split(',')
  .map((country) => country.trim().toUpperCase()).filter((country) => /^[A-Z]{2}$/.test(country));
const databaseEnabled = Boolean(process.env.DATABASE_URL);
const commerceEnabled = Boolean(databaseEnabled && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && shippingRateIds.length && shippingCountries.length);
const ownerPortalUsername = process.env.OWNER_PORTAL_USERNAME;
const ownerPortalPassword = process.env.OWNER_PORTAL_PASSWORD;
const ownerPortalEnabled = Boolean(ownerPortalUsername && ownerPortalPassword);
const ownerSessions = new Map();
const ownerLoginAttempts = new Map();
const ownerSessionLifetimeMs = 8 * 60 * 60 * 1000;
const ownerLoginWindowMs = 15 * 60 * 1000;
const ownerLoginMaximumAttempts = 5;

let stripe;
let prisma;
if (databaseEnabled) {
  prisma = new PrismaClient();
}
if (commerceEnabled) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

app.post('/api/commerce/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!commerceEnabled) return res.status(503).send('Commerce is not configured.');
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      if (event.data.object.payment_status === 'paid') await markOrderPaid(event.data.object);
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      await releaseOrderReservation(event.data.object.id, event.type === 'checkout.session.expired' ? OrderStatus.EXPIRED : OrderStatus.CANCELED);
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error(`Failed to process Stripe event ${event.id}`, error);
    return res.sendStatus(500);
  }
});

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '16kb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/auth/session', (req, res) => {
  const session = getOwnerSession(req);
  res.json({ authenticated: Boolean(session), username: session?.username || null });
});

app.post('/api/auth/login', (req, res) => {
  if (!ownerPortalEnabled) return res.sendStatus(404);
  const address = req.ip;
  const attempt = ownerLoginAttempts.get(address);
  if (attempt && attempt.resetAt > Date.now() && attempt.count >= ownerLoginMaximumAttempts) {
    return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
  }
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string'
    || !secureEquals(username, ownerPortalUsername) || !secureEquals(password, ownerPortalPassword)) {
    recordFailedOwnerLogin(address);
    return res.status(401).json({ error: 'Invalid owner username or password.' });
  }
  ownerLoginAttempts.delete(address);
  const token = crypto.randomBytes(32).toString('base64url');
  ownerSessions.set(token, { username: ownerPortalUsername, expiresAt: Date.now() + ownerSessionLifetimeMs });
  res.cookie('sip_owner_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: ownerSessionLifetimeMs,
    path: '/'
  });
  return res.json({ authenticated: true, username: ownerPortalUsername });
});

app.post('/api/auth/logout', (req, res) => {
  const token = getCookie(req, 'sip_owner_session');
  if (token) ownerSessions.delete(token);
  res.clearCookie('sip_owner_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  return res.json({ ok: true });
});

app.get('/owner-login.html', (req, res) => {
  if (!ownerPortalEnabled) return res.sendStatus(404);
  if (getOwnerSession(req)) return res.redirect('/admin.html');
  return res.sendFile(path.join(root, 'owner-login.html'));
});

app.get('/admin.html', requireOwnerPortal, (_req, res) => {
  res.sendFile(path.join(root, 'admin.html'));
});

app.get('/api/commerce/config', (_req, res) => {
  res.json({
    enabled: commerceEnabled,
    message: commerceEnabled
      ? 'Secure Checkout is ready.'
      : 'Secure checkout is unavailable. This site is in local demo mode; configure the Node commerce service environment to accept payments.'
  });
});

app.post('/api/custom-orders', async (req, res) => {
  if (!databaseEnabled) return res.status(503).json({ error: 'Hosted custom-order storage is not configured.' });
  const request = req.body;
  if (!request || typeof request !== 'object'
    || !isNonEmptyString(request.customerName, 120)
    || !isNonEmptyString(request.customerUsername, 80)
    || !isNonEmptyString(request.contactMethod, 32)
    || !isNonEmptyString(request.contactInfo, 250)
    || !isNonEmptyString(request.customizationLevel, 32)
    || !request.details || typeof request.details !== 'object' || Array.isArray(request.details)
    || typeof request.formspreeDelivered !== 'boolean') {
    return res.status(400).json({ error: 'Complete the required custom-order details before submitting.' });
  }
  try {
    const customOrder = await prisma.customOrderRequest.create({
      data: {
        customerName: request.customerName.trim(),
        customerUsername: request.customerUsername.trim(),
        contactMethod: request.contactMethod.trim(),
        contactInfo: request.contactInfo.trim(),
        customizationLevel: request.customizationLevel.trim(),
        details: request.details,
        formspreeDelivered: request.formspreeDelivered
      }
    });
    return res.status(201).json({ id: customOrder.id, status: customOrder.status });
  } catch (error) {
    console.error('Unable to store custom-order request', error);
    return res.status(500).json({ error: 'Your request was sent, but the hosted order record could not be saved.' });
  }
});

app.post('/api/commerce/checkout', async (req, res) => {
  if (!commerceEnabled) return res.status(503).json({ error: 'Secure checkout is not configured. Use demo mode locally or configure the server environment.' });
  const requestedItems = normalizeCart(req.body && req.body.items);
  if (!requestedItems.length) return res.status(400).json({ error: 'Your cart is empty or invalid.' });

  let order;
  try {
    order = await reserveOrder(requestedItems);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: order.items.map((item) => ({
        price_data: {
          currency: order.currency,
          product_data: { name: item.variantName ? `${item.productName} — ${item.variantName}` : item.productName },
          unit_amount: item.unitPriceCents
        },
        quantity: item.quantity
      })),
      shipping_address_collection: { allowed_countries: shippingCountries },
      shipping_options: shippingRateIds.map((shipping_rate) => ({ shipping_rate })),
      success_url: `${publicUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicUrl}/checkout/cancel?order_id=${order.id}`,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      expires_at: Math.floor(order.reservationExpiresAt.getTime() / 1000)
    });
    await prisma.order.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id } });
    return res.json({ url: session.url });
  } catch (error) {
    if (order) await releaseOrderReservationById(order.id, OrderStatus.CANCELED).catch(console.error);
    console.error('Unable to create checkout session', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to start secure checkout.' });
  }
});

app.get('/checkout/success', (_req, res) => res.redirect('/?checkout=success'));
app.get('/checkout/cancel', async (req, res) => {
  if (commerceEnabled && typeof req.query.order_id === 'string') {
    await releaseOrderReservationById(req.query.order_id, OrderStatus.CANCELED).catch(console.error);
  }
  res.redirect('/?checkout=cancel');
});

app.use((req, res, next) => {
  const restrictedPath = /^\/(?:admin\.html|owner-login\.html|server(?:\.js|\.ps1)?|package(?:-lock)?\.json|prisma|\.env)(?:\/|$)/i;
  if (restrictedPath.test(req.path)) return res.sendStatus(404);
  return next();
});
app.use(express.static(root, { index: 'index.html', dotfiles: 'deny' }));
app.use((_req, res) => res.status(404).send('Not found'));

function normalizeCart(items) {
  if (!Array.isArray(items) || items.length > 25) return [];
  const quantities = new Map();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(item.id)
      || (item.variantId !== undefined && (typeof item.variantId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(item.variantId)))
      || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return [];
    const key = `${item.id}:${item.variantId || `${item.id}-default`}`;
    quantities.set(key, { id: item.id, variantId: item.variantId || `${item.id}-default`, quantity: (quantities.get(key)?.quantity || 0) + item.quantity });
  }

  const normalized = [...quantities.values()];
  return normalized.every((item) => item.quantity <= 20) ? normalized : [];
}

function isNonEmptyString(value, maximumLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximumLength;
}

function requireOwnerPortal(req, res, next) {
  if (!ownerPortalEnabled) return res.sendStatus(404);
  if (!getOwnerSession(req)) return res.redirect('/owner-login.html');
  return next();
}

function getOwnerSession(req) {
  const token = getCookie(req, 'sip_owner_session');
  const session = token && ownerSessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    ownerSessions.delete(token);
    return null;
  }
  return session;
}

function getCookie(req, name) {
  const header = req.get('cookie');
  if (!header) return null;
  const cookie = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return null;
  }
}

function recordFailedOwnerLogin(address) {
  const previous = ownerLoginAttempts.get(address);
  const now = Date.now();
  const activeAttempt = previous && previous.resetAt > now ? previous : { count: 0, resetAt: now + ownerLoginWindowMs };
  ownerLoginAttempts.set(address, { ...activeAttempt, count: activeAttempt.count + 1 });
}

function secureEquals(value, expected) {
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

async function reserveOrder(items) {
  const expiresAt = new Date(Date.now() + reservationMinutes * 60_000);
  return prisma.$transaction(async (tx) => {
    const variants = await tx.$queryRaw`
      SELECT v.*, p.name AS "productName", p.currency, p.active AS "productActive"
      FROM "ProductVariant" v
      JOIN "Product" p ON p.id = v."productId"
      WHERE v.id IN (${Prisma.join(items.map((item) => item.variantId))})
      FOR UPDATE OF v, p
    `;
    if (variants.length !== items.length) throw httpError(400, 'One or more product variants are unavailable.');
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    const orderItems = items.map((item) => {
      const variant = byId.get(item.variantId);
      if (!variant || variant.productId !== item.id || !variant.productActive || !variant.active
        || variant.inventoryQuantity - variant.reservedQuantity < item.quantity) {
        throw httpError(409, `${variant?.productName || 'That variant'} is no longer available in that quantity.`);
      }
      return { variant, quantity: item.quantity };
    });
    if (new Set(orderItems.map((item) => item.variant.currency)).size !== 1) {
      throw httpError(400, 'All checkout items must use the same currency.');
    }
    for (const { variant, quantity } of orderItems) {
      await tx.productVariant.update({ where: { id: variant.id }, data: { reservedQuantity: { increment: quantity } } });
    }
    return tx.order.create({
      data: {
        currency: orderItems[0].variant.currency,
        subtotalCents: orderItems.reduce((sum, item) => sum + item.variant.priceCents * item.quantity, 0),
        reservationExpiresAt: expiresAt,
        items: { create: orderItems.map(({ variant, quantity }) => ({
          productId: variant.productId, productName: variant.productName, variantId: variant.id,
          variantName: variant.name, variantOptions: variant.optionValues, unitPriceCents: variant.priceCents, quantity
        })) }
      },
      include: { items: true }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function markOrderPaid(session) {
  const orderId = session.metadata && session.metadata.orderId;
  if (!orderId) throw new Error('Checkout session has no order ID.');
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status === OrderStatus.PAID) return;
    if (order.status !== OrderStatus.PENDING_PAYMENT) throw new Error(`Order ${orderId} is not payable.`);
    for (const item of order.items) {
      if (!item.variantId) throw new Error(`Order ${order.id} contains a legacy item with no variant.`);
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, reservedQuantity: { gte: item.quantity }, inventoryQuantity: { gte: item.quantity } },
        data: { reservedQuantity: { decrement: item.quantity }, inventoryQuantity: { decrement: item.quantity } }
      });
      if (updated.count !== 1) throw new Error(`Inventory reservation is invalid for variant ${item.variantId}.`);
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID, paidAt: new Date(), customerEmail: session.customer_details?.email || null,
        shippingName: session.shipping_details?.name || null, shippingAddress: session.shipping_details?.address || undefined
      }
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function releaseOrderReservation(sessionId, status) {
  const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: sessionId } });
  if (order) await releaseOrderReservationById(order.id, status);
}

async function releaseOrderReservationById(orderId, status) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status !== OrderStatus.PENDING_PAYMENT) return;
    for (const item of order.items) {
      if (!item.variantId) continue;
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, reservedQuantity: { gte: item.quantity } },
        data: { reservedQuantity: { decrement: item.quantity } }
      });
      if (updated.count !== 1) throw new Error(`Inventory reservation is invalid for variant ${item.variantId}.`);
    }
    await tx.order.update({ where: { id: order.id }, data: { status } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

app.listen(port, () => console.log(`Sip of Ghoulaid commerce server listening on ${publicUrl}`));
