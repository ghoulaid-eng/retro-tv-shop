'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getPublicConfig, readConfig } = require('../backend/config');
const {
    ValidationError,
    decimalToCents,
    validateCheckout,
    validateCustomOrder,
    validateWaitlist
} = require('../backend/validation');
const { buildCheckoutShippingOptions } = require('../backend/shipping');
const {
    OrderOperationError,
    orderEmailContent,
    validateFulfillment,
    validateRefund,
    validateSupport
} = require('../backend/order-operations');
const { AdminValidationError, normalizeAdminResource } = require('../backend/admin');

test('public capabilities never expose secrets and require complete checkout configuration', () => {
    const config = readConfig({
        DATABASE_URL: 'postgresql://secret',
        STRIPE_SECRET_KEY: 'sk_test_secret',
        STRIPE_WEBHOOK_SECRET: 'whsec_secret',
        STRIPE_SHIPPING_RATE_IDS: 'shr_one',
        STRIPE_ALLOWED_SHIPPING_COUNTRIES: 'us,CA'
    });
    const publicConfig = getPublicConfig(config);
    assert.deepEqual(publicConfig, {
        mode: 'production-commerce',
        databaseAvailable: true,
        catalogAvailable: true,
        customOrdersAvailable: true,
        checkoutAvailable: true,
        orderEmailsAvailable: false,
        adminAuthAvailable: false,
        supabaseUrl: '',
        supabaseAnonKey: '',
        shippingCountries: ['US', 'CA'],
        automaticTaxEnabled: true,
        freeShippingThresholdCents: 5000,
        localPickupAvailable: true
    });

    assert.equal(JSON.stringify(publicConfig).includes('secret'), false);
});

test('public configuration exposes only browser-safe Supabase Auth settings', () => {
    const config = readConfig({
        DATABASE_URL: 'postgresql://database-secret',
        SUPABASE_URL: 'https://project.supabase.co/',
        SUPABASE_ANON_KEY: 'sb_publishable_browser_key',
        SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_server_key',
        ADMIN_EMAIL_ALLOWLIST: 'Owner@Example.com, operations@example.com'
    });
    const publicConfig = getPublicConfig(config);

    assert.equal(publicConfig.adminAuthAvailable, true);
    assert.equal(publicConfig.supabaseUrl, 'https://project.supabase.co');
    assert.equal(publicConfig.supabaseAnonKey, 'sb_publishable_browser_key');
    assert.equal(JSON.stringify(publicConfig).includes('sb_secret_server_key'), false);
    assert.equal(JSON.stringify(publicConfig).includes('database-secret'), false);
    assert.deepEqual(config.adminEmails, ['owner@example.com', 'operations@example.com']);
});

test('order operations configuration exposes capability but never the Resend key', () => {
    const config = readConfig({
        RESEND_API_KEY: 're_secret',
        ORDER_EMAIL_FROM: 'Orders <orders@example.com>',
        SUPPORT_EMAIL: 'support@example.com'
    });
    assert.equal(config.emailConfigured, true);
    const publicConfig = getPublicConfig(config);
    assert.equal(publicConfig.orderEmailsAvailable, true);
    assert.equal(JSON.stringify(publicConfig).includes('re_secret'), false);
});

test('support requests default to the shop support mailbox', () => {
    assert.equal(readConfig({}).supportEmail, 'support@sipofghoulaid.com');
});

test('fulfillment requires tracking for shipped orders and HTTPS tracking links', () => {
    assert.deepEqual(validateFulfillment({
        status: 'shipped',
        trackingCarrier: 'USPS',
        trackingNumber: '9400',
        trackingUrl: 'https://tools.usps.com/track/9400'
    }), {
        status: 'SHIPPED',
        trackingCarrier: 'USPS',
        trackingNumber: '9400',
        trackingUrl: 'https://tools.usps.com/track/9400'
    });
    assert.throws(() => validateFulfillment({ status: 'SHIPPED' }), OrderOperationError);
    assert.throws(() => validateFulfillment({
        status: 'SHIPPED',
        trackingNumber: '9400',
        trackingUrl: 'http://insecure.example/9400'
    }), OrderOperationError);
});

test('refund and support validation reject unsafe or ambiguous input', () => {
    assert.deepEqual(validateRefund({ reason: 'Customer request', amount: '12.50' }), {
        reason: 'Customer request',
        amount: 12.5
    });
    assert.throws(() => validateRefund({ reason: 'x', amount: '1.234' }), OrderOperationError);
    assert.throws(() => validateSupport({ orderId: 'x', email: 'invalid', message: 'Help' }), OrderOperationError);
});

test('transactional order email escapes customer-controlled content', () => {
    const email = orderEmailContent('shipped', { id: '<order>', email: 'ghoul@example.com' }, {
        trackingCarrier: '<script>',
        trackingNumber: '<b>9400</b>',
        trackingUrl: 'https://example.com/?q=<bad>'
    });
    assert.equal(email.html.includes('<script>'), false);
    assert.equal(email.html.includes('<b>9400</b>'), false);
    assert.match(email.subject, /<order>/);
});

test('custom orders remain available without Stripe when database is configured', () => {
    const publicConfig = getPublicConfig(readConfig({ DATABASE_URL: 'postgresql://configured' }));
    assert.equal(publicConfig.customOrdersAvailable, true);
    assert.equal(publicConfig.checkoutAvailable, false);
});

test('shipping options are capped at Stripe checkout limits', () => {
    const config = readConfig({
        STRIPE_SHIPPING_RATE_IDS: 'shr_1,shr_2,shr_3,shr_4,shr_5,shr_6'
    });
    assert.deepEqual(config.shippingRateIds, ['shr_1', 'shr_2', 'shr_3', 'shr_4', 'shr_5']);
});

test('shipping rules offer pickup and enforce the free-shipping threshold', () => {
    const config = readConfig({
        STRIPE_SHIPPING_RATE_IDS: 'shr_standard,shr_priority',
        FREE_SHIPPING_THRESHOLD_CENTS: '5000',
        LOCAL_PICKUP_ENABLED: 'true'
    });
    const paid = buildCheckoutShippingOptions(4999, config);
    assert.deepEqual(paid.slice(0, 2), [
        { shipping_rate: 'shr_standard' },
        { shipping_rate: 'shr_priority' }
    ]);
    assert.equal(paid[2].shipping_rate_data.display_name, 'Local pickup — Redlands, CA');
    assert.equal(paid[2].shipping_rate_data.fixed_amount.amount, 0);

    const free = buildCheckoutShippingOptions(5000, config);
    assert.equal(free[0].shipping_rate_data.display_name, 'Free USPS standard shipping');
    assert.equal(free[0].shipping_rate_data.fixed_amount.amount, 0);
    assert.equal(free[1].shipping_rate_data.display_name, 'Local pickup — Redlands, CA');

    const capped = buildCheckoutShippingOptions(1000, readConfig({
        STRIPE_SHIPPING_RATE_IDS: 'shr_1,shr_2,shr_3,shr_4,shr_5',
        LOCAL_PICKUP_ENABLED: 'true'
    }));
    assert.equal(capped.length, 5);
    assert.equal(capped[4].shipping_rate_data.display_name, 'Local pickup — Redlands, CA');
});

test('checkout validation accepts bounded items and rejects invalid quantities', () => {
    assert.deepEqual(validateCheckout({
        items: [{ productId: 'mini-wax-melts', variant: '', quantity: 2 }],
        email: 'ghoul@example.com'
    }), {
        items: [{ productId: 'mini-wax-melts', variant: null, quantity: 2 }],
        email: 'ghoul@example.com'
    });
    assert.throws(
        () => validateCheckout({ items: [{ productId: 'x', quantity: 0 }] }),
        ValidationError
    );
});

test('custom-order validation normalizes allowed fields', () => {
    const order = validateCustomOrder({
        fullName: '  Ghoul Friend ',
        username: '@ghoul',
        contactMethod: 'EMAIL',
        contactInfo: 'ghoul@example.com',
        customizationLevel: 'exclusive',
        description: 'A spooky candle',
        scents: [' vanilla '],
        glitter: true
    });
    assert.equal(order.fullName, 'Ghoul Friend');
    assert.deepEqual(order.scents, ['vanilla']);
    assert.equal(order.contactMethod, 'email');
});

test('waitlist validation normalizes email and rejects invalid signups', () => {
    assert.deepEqual(validateWaitlist({ email: '  Ghoul@Example.COM ' }), {
        email: 'ghoul@example.com'
    });
    assert.throws(() => validateWaitlist({ email: 'not-an-email' }), ValidationError);
    assert.throws(() => validateWaitlist(null), ValidationError);
});

test('music admin resource accepts HTTPS video and rejects unsafe URLs', () => {
    const music = normalizeAdminResource('music', {
        enabled: true,
        songs: [{ title: ' Ghoul Radio ', artist: ' The Crypt ', url: 'https://media.example.com/song.mp4' }]
    });
    assert.equal(music.songs[0].title, 'Ghoul Radio');
    assert.equal(music.songs[0].artist, 'The Crypt');
    assert.match(music.songs[0].id, /^song-/);
    assert.throws(() => normalizeAdminResource('music', {
        enabled: true,
        songs: [{ title: 'Unsafe', url: 'javascript:alert(1)' }]
    }), AdminValidationError);
});

test('stored decimal prices convert to integer cents without float arithmetic', () => {
    assert.equal(decimalToCents('18.00'), 1800);
    assert.equal(decimalToCents('6.5'), 650);
    assert.throws(() => decimalToCents('1.234'));
});
