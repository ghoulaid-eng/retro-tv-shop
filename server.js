'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const Stripe = require('stripe');
const { PrismaClient, Prisma } = require('@prisma/client');
const { getPublicConfig, readConfig } = require('./backend/config');
const { buildCheckoutShippingOptions } = require('./backend/shipping');
const {
    ValidationError,
    decimalToCents,
    validateCheckout,
    validateCustomOrder
} = require('./backend/validation');
const {
    ADMIN_RESOURCE_DEFAULTS,
    AdminValidationError,
    normalizeAdminProducts,
    normalizeAdminResource,
    validateMediaUpload,
    verifySupabaseAdmin
} = require('./backend/admin');
const {
    OrderOperationError,
    orderEmailContent,
    sendResendEmail,
    validateFulfillment,
    validateReason,
    validateRefund,
    validateSupport
} = require('./backend/order-operations');

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
            scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
            styleSrc: ["'self'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'", ...(config.supabaseUrl ? [config.supabaseUrl] : [])],
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
const adminLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 180,
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
        handle: product.handle,
        emoji: product.emoji || '🛍️',
        description: product.description,
        descriptionHtml: product.descriptionHtml || '',
        subcategories: product.subcategories,
        categories: product.subcategories,
        listingPrice: Number(product.price.toString()),
        onSale: product.salePrice !== null,
        salePrice: product.salePrice ? Number(product.salePrice.toString()) : 0,
        shippingPrice: Number(product.shippingPrice.toString()),
        shippingWeight: Number(product.shippingWeight.toString()),
        shippingWeightUnit: product.shippingWeightUnit,
        packageSize: product.packageSize || '',
        mustShipAlone: product.mustShipAlone,
        trackInventory: product.trackInventory,
        variantGroupName: product.variantGroupName,
        variantDetails: product.variants
            .filter(variant => variant.active)
            .map(variant => ({
                id: variant.id,
                name: variant.name === 'Standard' ? '' : variant.name,
                price: variant.price ? Number(variant.price.toString()) : Number(product.price.toString()),
                stock: product.trackInventory && variant.inventory ? variant.inventory.quantity : null
            })),
        variants: product.variants
            .filter(variant => variant.active
                && variant.inventory
                && (!product.trackInventory || variant.inventory.quantity > variant.inventory.reserved))
            .map(variant => variant.name === 'Standard' ? '' : variant.name),
        images: product.media.filter(item => item.type === 'image').map(item => item.url),
        videos: product.media.filter(item => item.type === 'video').map(item => item.url),
        available: product.variants.some(variant => variant.active
            && variant.inventory
            && (!product.trackInventory || variant.inventory.quantity > variant.inventory.reserved)),
        priceSource: 'server',
        sourceUrl: product.sourceUrl || '',
        effectivePrice: Number(effectivePrice.toString())
    };
}

function skuFor(productId, variantName, index) {
    const base = `${productId}-${variantName}`
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 56);
    return `${base || 'PRODUCT'}-${index + 1}`;
}

async function requireAdmin(req, res, next) {
    try {
        req.admin = await verifySupabaseAdmin(config, req.get('authorization'));
        next();
    } catch (error) {
        next(error);
    }
}

async function recordAdminAudit(admin, action, resource, resourceId = null, metadata = null, client = prisma) {
    if (!client) return;
    await client.adminAuditLog.create({
        data: {
            adminEmail: admin.email,
            action,
            resource,
            resourceId,
            metadata: metadata || undefined
        }
    });
}

async function deliverOrderEmail(order, type, details = {}) {
    if (!order.email) return null;
    const content = orderEmailContent(type, order, { ...details, supportEmail: config.supportEmail });
    const delivery = await prisma.transactionalEmail.upsert({
        where: { orderId_type: { orderId: order.id, type } },
        update: {
            recipient: order.email,
            subject: content.subject,
            status: 'PENDING',
            error: null
        },
        create: {
            orderId: order.id,
            type,
            recipient: order.email,
            subject: content.subject,
            status: 'PENDING'
        }
    });
    try {
        const result = await sendResendEmail(config, {
            to: [order.email],
            subject: content.subject,
            html: content.html
        });
        return prisma.transactionalEmail.update({
            where: { id: delivery.id },
            data: {
                status: 'SENT',
                providerMessageId: result.id || null,
                sentAt: new Date(),
                error: null
            }
        });
    } catch (error) {
        await prisma.transactionalEmail.update({
            where: { id: delivery.id },
            data: { status: 'FAILED', error: error.message.slice(0, 1000) }
        });
        throw error;
    }
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
                fulfilledAt: new Date(),
                shippingMethod: typeof session.shipping_cost?.shipping_rate === 'object'
                    ? session.shipping_cost.shipping_rate.display_name || null
                    : null,
                shippingAmount: centsToDecimal(
                    session.total_details?.amount_shipping
                    ?? session.shipping_cost?.amount_total
                    ?? 0
                ),
                taxAmount: centsToDecimal(session.total_details?.amount_tax ?? 0),
                stripeShippingRateId: typeof session.shipping_cost?.shipping_rate === 'string'
                    ? session.shipping_cost.shipping_rate
                    : session.shipping_cost?.shipping_rate?.id || null,
                shippingAddress: session.collected_information?.shipping_details
                    || session.shipping_details
                    || undefined,
                adminData: {
                    ...(order.adminData && typeof order.adminData === 'object' ? order.adminData : {}),
                    fullName: session.collected_information?.shipping_details?.name
                        || session.shipping_details?.name
                        || order.email
                        || 'Checkout customer'
                }
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
    const paidOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (paidOrder?.email && config.emailConfigured) {
        await deliverOrderEmail(paidOrder, 'confirmation').catch(error => {
            console.error(`Order confirmation email failed for ${orderId}:`, error.message);
        });
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
                const detailedSession = await stripe.checkout.sessions.retrieve(session.id, {
                    expand: ['shipping_cost.shipping_rate']
                });
                await completePaidOrder(event, detailedSession);
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

app.post('/api/admin/media', adminLimiter, requireAdmin, express.raw({
    type: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
    limit: '15mb'
}), async (req, res, next) => {
    try {
        const contentType = String(req.get('content-type') || '').split(';')[0].toLowerCase();
        validateMediaUpload(contentType, req.body?.length || 0);
        const originalName = String(req.get('x-file-name') || 'upload')
            .replace(/[^A-Za-z0-9._-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 120) || 'upload';
        const objectPath = `products/${crypto.randomUUID()}-${originalName}`;
        const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${encodeURIComponent(config.supabaseStorageBucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
        const upload = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                apikey: config.supabaseServiceRoleKey,
                Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
                'Content-Type': contentType,
                'x-upsert': 'false'
            },
            body: req.body,
            signal: AbortSignal.timeout(30_000)
        });
        if (!upload.ok) {
            const message = await upload.text();
            console.error('Supabase media upload failed:', upload.status, message);
            throw new Error('Product media could not be uploaded.');
        }
        await recordAdminAudit(req.admin, 'upload', 'media', objectPath, { contentType, bytes: req.body.length });
        res.status(201).json({
            url: `${config.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(config.supabaseStorageBucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
            path: objectPath
        });
    } catch (error) {
        next(error);
    }
});

app.use(express.json({ limit: '64kb', strict: true }));

app.get('/api/commerce/config', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(getPublicConfig(config));
});

function adminOrderStatus(status) {
    if (status === 'PAID') return 'Completed';
    if (status === 'NEEDS_REVIEW') return 'Ready to Confirm';
    if (status === 'CHECKOUT_CREATED') return 'In Progress';
    return 'Pending';
}

function adminPaymentStatus(status) {
    if (status === 'PAID') return 'Paid';
    if (status === 'REFUNDED') return 'Refunded';
    if (status === 'FAILED') return 'Awaiting Payment';
    return 'Awaiting Payment';
}

function serializeCommerceAdminOrder(order) {
    const adminData = order.adminData && typeof order.adminData === 'object' ? order.adminData : {};
    const payment = order.payments[0];
    return {
        id: order.id,
        kind: 'commerce',
        fullName: adminData.fullName || order.email || 'Checkout customer',
        username: 'Stripe checkout',
        contactMethod: 'email',
        contactInfo: order.email || '',
        description: order.items.map(item => `${item.quantity}× ${item.name}${item.variant ? ` (${item.variant})` : ''}`).join(', '),
        paymentMethod: 'stripe',
        paymentStatus: payment ? adminPaymentStatus(payment.status) : 'Awaiting Payment',
        paymentAmount: payment ? Number(payment.amount.toString()) : 0,
        paymentReference: payment?.reference || payment?.providerPaymentIntentId || '',
        paymentNotes: payment?.notes || '',
        paymentReceivedAt: payment?.paidAt?.toISOString() || '',
        fulfillmentStatus: order.fulfillmentStatus,
        trackingCarrier: order.trackingCarrier || '',
        trackingNumber: order.trackingNumber || '',
        trackingUrl: order.trackingUrl || '',
        shippingMethod: order.shippingMethod || '',
        shippingAmount: Number(order.shippingAmount?.toString() || 0),
        taxAmount: Number(order.taxAmount?.toString() || 0),
        shippingAddress: order.shippingAddress || null,
        cancellationReason: order.cancellationReason || '',
        supportNotes: order.supportNotes || [],
        timeline: order.timeline || [],
        emailDeliveries: order.emailDeliveries || [],
        status: adminData.status || adminOrderStatus(order.status),
        createdAt: order.createdAt.toISOString()
    };
}

function serializeCustomAdminOrder(order) {
    const adminData = order.adminData && typeof order.adminData === 'object' ? order.adminData : {};
    return {
        id: order.id,
        kind: 'custom',
        fullName: order.fullName,
        username: order.username,
        contactMethod: order.contactMethod,
        contactInfo: order.contactInfo,
        customizationLevel: order.customizationLevel,
        description: order.description,
        refImages: order.refImages || '',
        colors: order.colors || '',
        handPaintedDetails: order.handPaintedDetails || '',
        scents: order.scents,
        glitter: order.glitter,
        glow: order.glow,
        additionalSets: order.additionalSets || '',
        additionalSetCount: order.additionalSetCount || '',
        deadline: order.deadline || '',
        additionalInfo: order.additionalInfo || '',
        paymentMethod: adminData.paymentMethod || order.preferredPaymentMethod || '',
        paymentStatus: adminData.paymentStatus || 'Awaiting Payment',
        paymentAmount: Number(adminData.paymentAmount || 0),
        paymentReference: adminData.paymentReference || '',
        paymentNotes: adminData.paymentNotes || '',
        paymentReceivedAt: adminData.paymentReceivedAt || '',
        status: adminData.status || order.status,
        createdAt: order.createdAt.toISOString()
    };
}

async function loadAdminResources() {
    const stored = await prisma.adminResource.findMany();
    const byKey = new Map(stored.map(resource => [resource.key, resource.value]));
    return Object.fromEntries(Object.entries(ADMIN_RESOURCE_DEFAULTS).map(([key, fallback]) => [
        key,
        byKey.has(key) ? byKey.get(key) : fallback
    ]));
}

async function loadAdminProducts() {
    const products = await prisma.product.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
            variants: { include: { inventory: true }, orderBy: { createdAt: 'asc' } },
            media: { orderBy: { position: 'asc' } }
        }
    });
    return products.map(publicProduct);
}

async function loadAdminOrders() {
    const [commerceOrders, customOrders] = await Promise.all([
        prisma.order.findMany({
            include: {
                items: { orderBy: { id: 'asc' } },
                payments: { orderBy: { createdAt: 'desc' } }
                ,
                timeline: { orderBy: { createdAt: 'desc' } },
                supportNotes: { orderBy: { createdAt: 'desc' } },
                emailDeliveries: { orderBy: { createdAt: 'desc' } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.customOrderRequest.findMany({ orderBy: { createdAt: 'desc' } })
    ]);
    return [
        ...commerceOrders.map(serializeCommerceAdminOrder),
        ...customOrders.map(serializeCustomAdminOrder)
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

app.get('/api/admin/session', adminLimiter, requireAdmin, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ email: req.admin.email });
});

app.get('/api/admin/bootstrap', adminLimiter, requireAdmin, async (req, res, next) => {
    try {
        const [products, orders, resources] = await Promise.all([
            loadAdminProducts(),
            loadAdminOrders(),
            loadAdminResources()
        ]);
        res.set('Cache-Control', 'no-store');
        res.json({ products, orders, ...resources, admin: { email: req.admin.email } });
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/resources/:name', adminLimiter, requireAdmin, async (req, res, next) => {
    try {
        const value = normalizeAdminResource(req.params.name, req.body);
        const resource = await prisma.adminResource.upsert({
            where: { key: req.params.name },
            update: { value, updatedBy: req.admin.email },
            create: { key: req.params.name, value, updatedBy: req.admin.email }
        });
        await recordAdminAudit(req.admin, 'update', 'admin-resource', req.params.name);
        res.json(resource.value);
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/resources/:name/reset', adminLimiter, requireAdmin, async (req, res, next) => {
    try {
        if (!(req.params.name in ADMIN_RESOURCE_DEFAULTS)) {
            throw new AdminValidationError('Unknown admin resource.', 404);
        }
        const value = ADMIN_RESOURCE_DEFAULTS[req.params.name];
        await prisma.adminResource.upsert({
            where: { key: req.params.name },
            update: { value, updatedBy: req.admin.email },
            create: { key: req.params.name, value, updatedBy: req.admin.email }
        });
        await recordAdminAudit(req.admin, 'reset', 'admin-resource', req.params.name);
        res.json(value);
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/products', adminLimiter, requireAdmin, async (req, res, next) => {
    try {
        const products = normalizeAdminProducts(req.body);
        await withSerializableRetry(async tx => {
            const incomingIds = products.map(product => product.id);
            await tx.product.updateMany({
                where: { id: { notIn: incomingIds } },
                data: { active: false }
            });

            for (const product of products) {
                await tx.product.upsert({
                    where: { id: product.id },
                    update: {
                        name: product.name,
                        handle: product.handle,
                        emoji: product.emoji,
                        description: product.description,
                        descriptionHtml: product.descriptionHtml || null,
                        subcategories: product.categories,
                        price: product.listingPrice,
                        salePrice: product.onSale ? product.salePrice : null,
                        shippingPrice: product.shippingPrice,
                        shippingWeight: product.shippingWeight,
                        shippingWeightUnit: product.shippingWeightUnit,
                        packageSize: product.packageSize || null,
                        mustShipAlone: product.mustShipAlone,
                        trackInventory: product.trackInventory,
                        variantGroupName: product.variantGroupName,
                        sourceUrl: product.sourceUrl || null,
                        active: product.available
                    },
                    create: {
                        id: product.id,
                        name: product.name,
                        handle: product.handle,
                        emoji: product.emoji,
                        description: product.description,
                        descriptionHtml: product.descriptionHtml || null,
                        subcategories: product.categories,
                        price: product.listingPrice,
                        salePrice: product.onSale ? product.salePrice : null,
                        shippingPrice: product.shippingPrice,
                        shippingWeight: product.shippingWeight,
                        shippingWeightUnit: product.shippingWeightUnit,
                        packageSize: product.packageSize || null,
                        mustShipAlone: product.mustShipAlone,
                        trackInventory: product.trackInventory,
                        variantGroupName: product.variantGroupName,
                        sourceUrl: product.sourceUrl || null,
                        active: product.available
                    }
                });

                const variants = product.variantDetails.length
                    ? product.variantDetails
                    : [{ name: 'Standard', price: product.listingPrice, stock: product.stock }];
                await tx.productVariant.updateMany({
                    where: { productId: product.id, name: { notIn: variants.map(variant => variant.name) } },
                    data: { active: false }
                });

                for (const [index, variant] of variants.entries()) {
                    const storedVariant = await tx.productVariant.upsert({
                        where: { productId_name: { productId: product.id, name: variant.name || 'Standard' } },
                        update: { price: variant.price, active: true },
                        create: {
                            productId: product.id,
                            name: variant.name || 'Standard',
                            sku: skuFor(product.id, variant.name || 'Standard', index),
                            price: variant.price,
                            active: true
                        },
                        include: { inventory: true }
                    });
                    const quantity = product.trackInventory ? Number(variant.stock ?? product.stock ?? 0) : 0;
                    if (storedVariant.inventory && quantity < storedVariant.inventory.reserved) {
                        throw new AdminValidationError(
                            `${product.name} / ${variant.name || 'Standard'} stock cannot be below its reserved quantity.`
                        );
                    }
                    await tx.inventory.upsert({
                        where: { variantId: storedVariant.id },
                        update: { quantity },
                        create: { variantId: storedVariant.id, quantity }
                    });
                }

                const media = [
                    ...product.images.map(url => ({ type: 'image', url })),
                    ...product.videos.map(url => ({ type: 'video', url }))
                ];
                await tx.productMedia.deleteMany({ where: { productId: product.id } });
                if (media.length) {
                    await tx.productMedia.createMany({
                        data: media.map((item, position) => ({
                            productId: product.id,
                            type: item.type,
                            url: item.url,
                            alt: `${product.name} preview ${position + 1}`,
                            position
                        }))
                    });
                }
            }
            await recordAdminAudit(req.admin, 'sync', 'products', null, { count: products.length }, tx);
        });
        res.json(await loadAdminProducts());
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/orders', adminLimiter, requireAdmin, async (req, res, next) => {
    try {
        if (!Array.isArray(req.body) || req.body.length > 2000) {
            throw new AdminValidationError('Orders must be an array with at most 2,000 entries.');
        }
        const incoming = req.body.filter(order => order && typeof order === 'object' && order.id);
        const incomingCustomIds = incoming.filter(order => order.kind === 'custom').map(order => String(order.id));

        await withSerializableRetry(async tx => {
            const storedCustomOrders = await tx.customOrderRequest.findMany({ select: { id: true } });
            const deletableIds = storedCustomOrders
                .map(order => order.id)
                .filter(id => !incomingCustomIds.includes(id));
            if (deletableIds.length) {
                await tx.customOrderRequest.deleteMany({ where: { id: { in: deletableIds } } });
            }

            for (const order of incoming) {
                const id = String(order.id).slice(0, 120);
                const adminData = {
                    status: String(order.status || 'Pending').slice(0, 80),
                    paymentMethod: String(order.paymentMethod || '').slice(0, 80),
                    paymentStatus: String(order.paymentStatus || 'Awaiting Payment').slice(0, 80),
                    paymentAmount: Math.max(0, Number(order.paymentAmount || 0)),
                    paymentReference: String(order.paymentReference || '').slice(0, 240),
                    paymentNotes: String(order.paymentNotes || '').slice(0, 2000),
                    paymentReceivedAt: String(order.paymentReceivedAt || '').slice(0, 80)
                };

                if (order.kind === 'custom') {
                    await tx.customOrderRequest.updateMany({
                        where: { id },
                        data: { adminData }
                    });

                    continue;
                }

                await tx.order.updateMany({
                    where: { id },
                    data: {
                        adminData,
                        fulfilledAt: adminData.status === 'Completed' ? new Date() : undefined
                    }
                });
                const paymentStatus = adminData.paymentStatus === 'Paid'
                    ? 'PAID'
                    : adminData.paymentStatus === 'Refunded'
                        ? 'REFUNDED'
                        : 'PENDING';
                const existingPayment = await tx.payment.findFirst({
                    where: { orderId: id },
                    orderBy: { createdAt: 'desc' }
                });
                if (existingPayment) {
                    await tx.payment.update({
                        where: { id: existingPayment.id },
                        data: {
                            status: paymentStatus,
                            amount: adminData.paymentAmount,
                            reference: adminData.paymentReference || null,
                            notes: adminData.paymentNotes || null,
                            paidAt: paymentStatus === 'PAID'
                                ? (existingPayment.paidAt || new Date())
                                : existingPayment.paidAt
                        }
                    });
                }
            }
            await recordAdminAudit(req.admin, 'sync', 'orders', null, { count: incoming.length }, tx);
        });
        res.json(await loadAdminOrders());
    } catch (error) {
        next(error);
    }
});

app.patch('/api/admin/orders/:id/fulfillment', adminLimiter, requireAdmin, async (req, res, next) => {
    try {
        const input = validateFulfillment(req.body);
        const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
        if (!existing) throw new OrderOperationError('Order not found.', 404, 'ORDER_NOT_FOUND');
        if (!['PAID', 'PROCESSING', 'SHIPPED'].includes(existing.status)) {
            throw new OrderOperationError('Only paid orders can enter fulfillment.', 409, 'INVALID_ORDER_STATE');
        }

        const status = input.status;
        const order = await prisma.$transaction(async tx => {
            const updated = await tx.order.update({
                where: { id: existing.id },
                data: {
                    status,
                    fulfillmentStatus: status,
                    trackingCarrier: input.trackingCarrier || existing.trackingCarrier,
                    trackingNumber: input.trackingNumber || existing.trackingNumber,
                    trackingUrl: input.trackingUrl || existing.trackingUrl,
                    shippedAt: status === 'SHIPPED' ? (existing.shippedAt || new Date()) : existing.shippedAt,
                    deliveredAt: status === 'DELIVERED' ? (existing.deliveredAt || new Date()) : existing.deliveredAt
                }
            });
            await tx.orderTimelineEvent.create({
                data: {
                    orderId: existing.id,
                    type: status,
                    message: status === 'SHIPPED'
                        ? `Order shipped with tracking ${input.trackingNumber}.`
                        : `Order marked ${status.toLowerCase()}.`,
                    actorEmail: req.admin.email,
                    metadata: input
                }
            });
            await recordAdminAudit(req.admin, 'fulfillment-update', 'order', existing.id, input, tx);
            return updated;
        });
        const email = await deliverOrderEmail(order, status.toLowerCase(), input);
        res.json({ order: serializeCommerceAdminOrder({ ...order, items: [], payments: [], supportNotes: [], timeline: [], emailDeliveries: email ? [email] : [] }) });
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/orders/:id/cancel', adminLimiter, requireAdmin, async (req, res, next) => {
    try {
        const { reason } = validateReason(req.body);
        const existing = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { payments: { orderBy: { createdAt: 'desc' } } }
        });
        if (!existing) throw new OrderOperationError('Order not found.', 404, 'ORDER_NOT_FOUND');
        if (['CANCELED', 'SHIPPED', 'DELIVERED', 'REFUNDED'].includes(existing.status)) {
            throw new OrderOperationError('Canceled, shipped, delivered, or refunded orders cannot be canceled.', 409, 'INVALID_ORDER_STATE');
        }
        if (!existing.payments.some(payment => payment.status === 'PAID')) {
            await releaseOrder(existing.id, 'CANCELED');
        }
        const order = await prisma.$transaction(async tx => {
            const updated = await tx.order.update({
                where: { id: existing.id },
                data: { status: 'CANCELED', canceledAt: new Date(), cancellationReason: reason }
            });
            await tx.orderTimelineEvent.create({
                data: { orderId: existing.id, type: 'CANCELED', message: reason, actorEmail: req.admin.email }
            });
            await recordAdminAudit(req.admin, 'cancel', 'order', existing.id, { reason }, tx);
            return updated;
        });
        await deliverOrderEmail(order, 'canceled', { reason });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/orders/:id/refund', adminLimiter, requireAdmin, async (req, res, next) => {
    let claimedPaymentId = null;
    try {
        const input = validateRefund(req.body);
        if (!stripe) throw new OrderOperationError('Stripe refunds are not configured.', 503, 'REFUNDS_NOT_CONFIGURED');
        const existing = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { payments: { orderBy: { createdAt: 'desc' } } }
        });
        if (!existing) throw new OrderOperationError('Order not found.', 404, 'ORDER_NOT_FOUND');
        const payment = existing.payments.find(item => item.status === 'PAID' && item.providerPaymentIntentId);
        if (!payment) throw new OrderOperationError('No refundable Stripe payment was found.', 409, 'PAYMENT_NOT_REFUNDABLE');
        const paidAmount = Number(payment.amount.toString());
        const amount = input.amount ?? paidAmount;
        const alreadyRefunded = Number(payment.refundAmount.toString());
        if (amount + alreadyRefunded > paidAmount) {
            throw new OrderOperationError('Refund amount exceeds the remaining paid amount.');
        }
        const claim = await prisma.payment.updateMany({
            where: { id: payment.id, refundPending: false },
            data: { refundPending: true }
        });
        if (claim.count !== 1) {
            throw new OrderOperationError('Another refund is already processing for this payment.', 409, 'REFUND_IN_PROGRESS');
        }
        claimedPaymentId = payment.id;

        const refund = await stripe.refunds.create({
            payment_intent: payment.providerPaymentIntentId,
            amount: Math.round(amount * 100),
            metadata: { orderId: existing.id, reason: input.reason.slice(0, 500) }
        }, { idempotencyKey: `refund-${existing.id}-${Math.round((alreadyRefunded + amount) * 100)}` });

        const fullyRefunded = amount + alreadyRefunded === paidAmount;
        const order = await prisma.$transaction(async tx => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    refundAmount: { increment: amount },
                    providerRefundId: refund.id,
                    refundPending: false,
                    status: fullyRefunded ? 'REFUNDED' : 'PAID',
                    notes: input.reason
                }
            });
            const updated = await tx.order.update({
                where: { id: existing.id },
                data: {
                    status: fullyRefunded ? 'REFUNDED' : existing.status,
                    refundedAt: fullyRefunded ? new Date() : existing.refundedAt
                }
            });
            await tx.orderTimelineEvent.create({
                data: {
                    orderId: existing.id,
                    type: fullyRefunded ? 'REFUNDED' : 'PARTIAL_REFUND',
                    message: `${input.reason} ($${amount.toFixed(2)})`,
                    actorEmail: req.admin.email,
                    metadata: { refundId: refund.id, amount }
                }
            });
            await recordAdminAudit(req.admin, 'refund', 'order', existing.id, { refundId: refund.id, amount }, tx);
            return updated;
        });
        claimedPaymentId = null;
        await deliverOrderEmail(order, 'refunded', { reason: input.reason, amount: `$${amount.toFixed(2)}` });
        res.json({ success: true, refundId: refund.id, amount, fullyRefunded });
    } catch (error) {
        if (claimedPaymentId) {
            await prisma.payment.updateMany({
                where: { id: claimedPaymentId, refundPending: true },
                data: { refundPending: false }
            }).catch(releaseError => console.error('Unable to release refund lock:', releaseError));
        }
        next(error);
    }
});

app.post('/api/admin/orders/:id/support-notes', adminLimiter, requireAdmin, async (req, res, next) => {
    try {
        const message = String(req.body?.message || '').trim();
        if (!message || message.length > 4000) {
            throw new OrderOperationError('Support note must be between 1 and 4,000 characters.');
        }
        const order = await prisma.order.findUnique({ where: { id: req.params.id }, select: { id: true } });
        if (!order) throw new OrderOperationError('Order not found.', 404, 'ORDER_NOT_FOUND');
        const note = await prisma.orderSupportNote.create({
            data: {
                orderId: order.id,
                authorEmail: req.admin.email,
                message,
                source: 'ADMIN',
                customerVisible: Boolean(req.body?.customerVisible)
            }
        });
        await recordAdminAudit(req.admin, 'support-note', 'order', order.id, { noteId: note.id });
        res.status(201).json(note);
    } catch (error) {
        next(error);
    }
});

app.post('/api/support/orders', writeLimiter, async (req, res, next) => {
    try {
        if (!prisma) return unavailable(res, 'support', 'Hosted order support is not configured.');
        const input = validateSupport(req.body);
        const order = await prisma.order.findFirst({
            where: { id: input.orderId, email: { equals: input.email, mode: 'insensitive' } }
        });
        if (order) {
            await prisma.orderSupportNote.create({
                data: {
                    orderId: order.id,
                    authorEmail: input.email,
                    message: input.message,
                    source: 'CUSTOMER',
                    customerVisible: true
                }
            });
            if (config.emailConfigured && config.supportEmail) {
                await sendResendEmail(config, {
                    to: [config.supportEmail],
                    reply_to: input.email,
                    subject: `Order support request — ${order.id}`,
                    html: `<p>Order: ${order.id}</p><p>${input.message.replace(/[&<>"']/g, '')}</p>`
                });
            }
        }
        res.status(202).json({ message: 'If the order details match, the support request has been received.' });
    } catch (error) {
        next(error);
    }
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
                        tax_code: config.stripeDefaultTaxCode,
                        metadata: {
                            productId: line.product.id,
                            variantId: line.variant.id
                        }
                    }
                }
            })),
            customer_email: input.email || undefined,
            automatic_tax: { enabled: config.automaticTaxEnabled },
            shipping_address_collection: { allowed_countries: config.allowedCountries },
            shipping_options: buildCheckoutShippingOptions(
                decimalToCents(reservation.order.subtotal.toString()),
                config
            ),
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
app.get('/product/:handle', (req, res) => res.sendFile('index.html', { root: staticRoot }));
app.get('/policies/:policy', (req, res) => res.sendFile('index.html', { root: staticRoot }));
app.use('/assets/products', express.static(path.join(staticRoot, 'assets', 'products'), {
    fallthrough: false,
    immutable: true,
    maxAge: '1y'
}));
app.get('/:file', (req, res, next) => {
    if (!staticFiles.has(req.params.file)) return next();
    if (req.params.file === 'admin.html') {
        res.set({
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow, noarchive'
        });
    }
    res.sendFile(req.params.file, { root: staticRoot });
});

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'API route not found.' });
});
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ValidationError || error instanceof AdminValidationError || error instanceof OrderOperationError) {
        return res.status(error.statusCode).json({
            error: error.code || 'VALIDATION_ERROR',
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
