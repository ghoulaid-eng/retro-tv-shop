'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const Stripe = require('stripe');
const { PrismaClient, Prisma } = require('@prisma/client');
const { getPublicConfig, readConfig } = require('./backend/config');
const {
    ValidationError,
    decimalToCents,
    validateCheckout,
    validateCustomOrder
} = require('./backend/validation');

const config = readConfig();
const prisma = config.databaseConfigured ? new PrismaClient() : null;
const stripe = config.stripeConfigured ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const app = express();
const staticRoot = path.resolve(__dirname);

if (config.trustProxy) {
    app.set('trust proxy', 1);
}
app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'"],
            upgradeInsecureRequests: config.publicUrl.startsWith('https:') ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false
}));

const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false
});
const writeLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false
});

function unavailable(res, capability, message) {
    return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        capability,
        message
    });
}

function centsToDecimal(cents) {
    return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

function publicProduct(product) {
    const effectivePrice = product.salePrice ?? product.price;
    return {
        id: product.id,
        name: product.name,
        emoji: product.emoji || '🛍️',
        description: product.description,
        subcategories: product.subcategories,
        listingPrice: Number(product.price.toString()),
        onSale: product.salePrice !== null,
        salePrice: product.salePrice ? Number(product.salePrice.toString()) : 0,
        shippingPrice: 0,
        variants: product.variants
            .filter(variant => variant.active && variant.inventory && variant.inventory.quantity > variant.inventory.reserved)
            .map(variant => variant.name === 'Standard' ? '' : variant.name),
        images: product.media.filter(item => item.type === 'image').map(item => item.url),
        videos: product.media.filter(item => item.type === 'video').map(item => item.url),
        available: product.variants.some(variant => variant.active
            && variant.inventory
            && variant.inventory.quantity > variant.inventory.reserved),
        priceSource: 'server',
        effectivePrice: Number(effectivePrice.toString())
    };
}

async function withSerializableRetry(work) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await prisma.$transaction(work, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable
            });
        } catch (error) {
            if (error.code !== 'P2034' || attempt === 2) {
                throw error;
            }
        }
    }
    throw new Error('Transaction retry exhausted.');
}

async function releaseOrder(orderId, nextStatus = 'EXPIRED') {
    if (!prisma) return false;
    return withSerializableRetry(async tx => {
        const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
        if (!order || order.fulfilledAt || order.releasedAt || order.status === 'PAID') {
            return false;
        }
        for (const item of order.items) {
            const released = await tx.inventory.updateMany({
                where: { variantId: item.variantId, reserved: { gte: item.quantity } },
                data: { reserved: { decrement: item.quantity } }
            });
            if (released.count !== 1) throw new Error('Reserved inventory is inconsistent.');
        }
        await tx.payment.updateMany({
            where: { orderId, status: 'PENDING' },
            data: { status: 'FAILED' }
        });
        await tx.order.update({
            where: { id: orderId },
            data: { status: nextStatus, releasedAt: new Date() }
        });
        return true;
    });
}

async function releaseExpiredReservations() {
    if (!prisma) return;
    // Stripe events can arrive after the session timestamp; the grace period
    // prevents cleanup racing a valid paid webhook.
    const cleanupCutoff = new Date(Date.now() - 10 * 60_000);
    const expired = await prisma.order.findMany({
        where: {
            status: { in: ['PENDING_CHECKOUT', 'CHECKOUT_CREATED'] },
            reservationExpiresAt: { lt: cleanupCutoff },
            fulfilledAt: null,
            releasedAt: null
        },
        select: { id: true },
        take: 100
    });
    await Promise.allSettled(expired.map(order => releaseOrder(order.id)));
}

async function reserveOrder(input) {
    const grouped = new Map();
    for (const item of input.items) {
        const key = `${item.productId}\u0000${item.variant || ''}`;
        const existing = grouped.get(key);
        if (existing) {
            existing.quantity += item.quantity;
            if (existing.quantity > 10) {
                throw new ValidationError('A product variant cannot have quantity greater than 10.');
            }
        } else {
            grouped.set(key, { ...item });
        }
    }

    return withSerializableRetry(async tx => {
        const productIds = [...new Set([...grouped.values()].map(item => item.productId))];
        const products = await tx.product.findMany({
            where: { id: { in: productIds }, active: true },
            include: { variants: { include: { inventory: true } } }
        });
        const byId = new Map(products.map(product => [product.id, product]));
        const lines = [];
        let subtotalCents = 0;

        for (const requested of grouped.values()) {
            const product = byId.get(requested.productId);
            if (!product) throw new ValidationError(`Product "${requested.productId}" is unavailable.`);
            const variantName = requested.variant || 'Standard';
            const variant = product.variants.find(candidate => candidate.active && candidate.name === variantName);
            if (!variant || !variant.inventory) {
                throw new ValidationError(`${product.name} variant "${variantName}" is unavailable.`);
            }
            if (variant.inventory.quantity - variant.inventory.reserved < requested.quantity) {
                throw new ValidationError(`Not enough inventory is available for ${product.name} (${variantName}).`);
            }
            const unitPrice = variant.price ?? product.salePrice ?? product.price;
            const unitCents = decimalToCents(unitPrice.toString());
            subtotalCents += unitCents * requested.quantity;
            lines.push({ requested, product, variant, unitPrice, unitCents });
        }

        const expiresAt = new Date(Date.now() + config.reservationMinutes * 60_000);
        const order = await tx.order.create({
            data: {
                email: input.email,
                subtotal: centsToDecimal(subtotalCents),
                reservationExpiresAt: expiresAt,
                items: {
                    create: lines.map(line => ({
                        productId: line.product.id,
                        variantId: line.variant.id,
                        name: line.product.name,
                        variant: line.variant.name,
                        unitPrice: line.unitPrice,
                        quantity: line.requested.quantity
                    }))
                },
                payments: {
                    create: { amount: centsToDecimal(subtotalCents), currency: 'usd' }
                }
            }
        });
        for (const line of lines) {
            await tx.inventory.update({
                where: { variantId: line.variant.id },
                data: { reserved: { increment: line.requested.quantity } }
            });
        }
        return { order, lines, expiresAt };
    });
}

async function completePaidOrder(event, session) {
    const orderId = session.metadata?.orderId;
    if (!orderId || session.payment_status !== 'paid') {
        throw new Error('Paid checkout event is missing a valid order link.');
    }
    const needsReview = await withSerializableRetry(async tx => {
        const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
        if (!order) throw new Error('Linked order was not found.');
        if (order.fulfilledAt || order.status === 'PAID') {
            await tx.webhookEvent.update({
                where: { id: event.id },
                data: { processedAt: new Date(), error: null }
            });
            return false;
        }
        const reservationWasReleased = Boolean(order.releasedAt);

        for (const item of order.items) {
            const result = reservationWasReleased
                ? await tx.inventory.updateMany({
                    where: { variantId: item.variantId },
                    data: { quantity: { decrement: item.quantity } }
                })
                : await tx.inventory.updateMany({
                    where: {
                        variantId: item.variantId,
                        reserved: { gte: item.quantity },
                        quantity: { gte: item.quantity }
                    },
                    data: {
                        reserved: { decrement: item.quantity },
                        quantity: { decrement: item.quantity }
                    }
                });
            if (result.count !== 1) throw new Error('Reserved inventory is inconsistent.');
        }
        const paymentIntent = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;
        const paidAmount = Number.isInteger(session.amount_total)
            ? centsToDecimal(session.amount_total)
            : order.subtotal;
        await tx.payment.updateMany({
            where: { orderId },
            data: {
                status: 'PAID',
                amount: paidAmount,
                providerPaymentIntentId: paymentIntent || null,
                paidAt: new Date()
            }
        });
        await tx.order.update({
            where: { id: orderId },
            data: {
                status: reservationWasReleased ? 'NEEDS_REVIEW' : 'PAID',
                fulfilledAt: new Date()
            }
        });
        await tx.webhookEvent.update({
            where: { id: event.id },
            data: {
                processedAt: new Date(),
                error: reservationWasReleased
                    ? 'Payment arrived after inventory reservation release; manual review required.'
                    : null
            }
        });
        return reservationWasReleased;
    });
    if (needsReview) {
        console.error(`Paid order ${orderId} requires manual inventory review after reservation release.`);
    }
}

app.post('/api/commerce/webhook', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
    if (!prisma || !stripe || !config.webhookConfigured) {
        return unavailable(res, 'webhooks', 'Stripe webhooks are not configured.');
    }
    const signature = req.get('stripe-signature');
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
        return res.status(400).json({ error: 'INVALID_SIGNATURE', message: 'Invalid Stripe webhook signature.' });
    }

    try {
        const stored = await prisma.webhookEvent.upsert({
            where: { id: event.id },
            update: {},
            create: {
                id: event.id,
                type: event.type,
                payload: JSON.parse(req.body.toString('utf8'))
            }
        });
        if (stored.processedAt) return res.json({ received: true, duplicate: true });

        const session = event.data.object;
        if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
            if (session.payment_status === 'paid') {
                await completePaidOrder(event, session);
            } else {
                await prisma.webhookEvent.update({
                    where: { id: event.id },
                    data: { processedAt: new Date(), error: null }
                });
            }
        } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
            if (session.metadata?.orderId) await releaseOrder(session.metadata.orderId, 'EXPIRED');
            await prisma.webhookEvent.update({
                where: { id: event.id },
                data: { processedAt: new Date(), error: null }
            });
        } else {
            await prisma.webhookEvent.update({
                where: { id: event.id },
                data: { processedAt: new Date(), error: null }
            });
        }
        return res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing failed:', error);
        await prisma.webhookEvent.updateMany({
            where: { id: event.id },
            data: { error: String(error.message || error).slice(0, 1000) }
        }).catch(() => {});
        return res.status(500).json({ error: 'WEBHOOK_PROCESSING_FAILED', message: 'Webhook processing failed.' });
    }
});

app.use('/api', apiLimiter);
app.use(express.json({ limit: '64kb', strict: true }));

app.get('/api/commerce/config', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(getPublicConfig(config));
});

app.get('/api/health', async (req, res) => {
    let database = config.databaseConfigured ? 'unreachable' : 'not-configured';
    if (prisma) {
        try {
            await prisma.$queryRaw`SELECT 1`;
            database = 'ready';
        } catch {
            database = 'unreachable';
        }
    }
    const status = config.databaseConfigured && database !== 'ready' ? 503 : 200;
    res.status(status).json({ status: status === 200 ? 'ok' : 'degraded', database });
});

app.get('/api/catalog', async (req, res, next) => {
    if (!prisma) return unavailable(res, 'catalog', 'Hosted catalog is not configured.');
    try {
        const products = await prisma.product.findMany({
            where: { active: true },
            orderBy: { createdAt: 'asc' },
            include: {
                variants: { where: { active: true }, include: { inventory: true }, orderBy: { createdAt: 'asc' } },
                media: { orderBy: { position: 'asc' } }
            }
        });
        res.json({ products: products.map(publicProduct), source: 'hosted' });
    } catch (error) {
        next(error);
    }
});

app.post('/api/custom-orders', writeLimiter, async (req, res, next) => {
    if (!prisma) {
        return unavailable(res, 'custom-orders', 'Hosted custom-order storage is not configured.');
    }
    try {
        const input = validateCustomOrder(req.body);
        const { paymentMethod, ...requestData } = input;
        const request = await prisma.customOrderRequest.create({
            data: {
                ...requestData,
                preferredPaymentMethod: paymentMethod
            },
            select: { id: true, status: true, createdAt: true }
        });
        res.status(201).json({ request, persistence: 'hosted' });
    } catch (error) {
        next(error);
    }
});

app.post('/api/commerce/checkout-sessions', writeLimiter, async (req, res, next) => {
    const capabilities = getPublicConfig(config);
    if (!capabilities.checkoutAvailable || !prisma || !stripe) {
        return unavailable(res, 'checkout', 'Secure checkout is not fully configured.');
    }
    let reservation;
    let checkoutSession;
    try {
        const input = validateCheckout(req.body);
        reservation = await reserveOrder(input);
        checkoutSession = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: reservation.lines.map(line => ({
                quantity: line.requested.quantity,
                price_data: {
                    currency: 'usd',
                    unit_amount: line.unitCents,
                    product_data: {
                        name: line.product.name,
                        description: line.variant.name === 'Standard' ? undefined : `Variant: ${line.variant.name}`,
                        metadata: {
                            productId: line.product.id,
                            variantId: line.variant.id
                        }
                    }
                }
            })),
            customer_email: input.email || undefined,
            shipping_address_collection: { allowed_countries: config.allowedCountries },
            shipping_options: config.shippingRateIds.map(shippingRate => ({ shipping_rate: shippingRate })),
            success_url: `${config.publicUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.publicUrl}/?checkout=cancelled`,
            expires_at: Math.floor(reservation.expiresAt.getTime() / 1000),
            metadata: { orderId: reservation.order.id },
            payment_intent_data: { metadata: { orderId: reservation.order.id } }
        }, { idempotencyKey: `checkout-${reservation.order.id}` });
        const stateUpdate = await prisma.order.updateMany({
            where: { id: reservation.order.id, status: 'PENDING_CHECKOUT' },
            data: { stripeCheckoutSession: checkoutSession.id, status: 'CHECKOUT_CREATED' }
        });
        if (stateUpdate.count === 0) {
            await prisma.order.update({
                where: { id: reservation.order.id },
                data: { stripeCheckoutSession: checkoutSession.id }
            });
        }
        res.status(201).json({ url: checkoutSession.url, orderId: reservation.order.id });
    } catch (error) {
        if (reservation?.order?.id) {
            let safeToRelease = !checkoutSession;
            if (checkoutSession) {
                try {
                    await stripe.checkout.sessions.expire(checkoutSession.id);
                    safeToRelease = true;
                } catch (expireError) {
                    console.error('Unable to expire orphaned Stripe session:', expireError);
                }
            }
            if (safeToRelease) {
                await releaseOrder(reservation.order.id, 'CANCELED').catch(releaseError => {
                    console.error('Unable to release failed checkout reservation:', releaseError);
                });
            }
        }
        next(error);
    }
});

const staticFiles = new Set([
    'index.html', 'admin.html', 'script.js', 'admin.js', 'products.js',
    'products.json', 'styles.css'
]);
app.get('/', (req, res) => res.sendFile('index.html', { root: staticRoot }));
app.use('/assets/products', express.static(path.join(staticRoot, 'assets', 'products'), {
    fallthrough: false,
    immutable: true,
    maxAge: '1y'
}));
app.get('/:file', (req, res, next) => {
    if (!staticFiles.has(req.params.file)) return next();
    res.sendFile(req.params.file, { root: staticRoot });
});

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'API route not found.' });
});
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ValidationError) {
        return res.status(error.statusCode).json({
            error: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
        });
    }
    if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).json({ error: 'INVALID_JSON', message: 'Request body must be valid JSON.' });
    }
    console.error('Request failed:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'The request could not be completed.' });
});

const server = app.listen(config.port, () => {
    console.log(`Sip of Ghoulaid server listening on ${config.publicUrl}`);
});

const cleanupTimer = prisma
    ? setInterval(() => releaseExpiredReservations().catch(error => console.error('Reservation cleanup failed:', error)), 60_000)
    : null;
cleanupTimer?.unref();

async function shutdown() {
    server.close();
    if (prisma) await prisma.$disconnect();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

module.exports = { app, releaseExpiredReservations };
