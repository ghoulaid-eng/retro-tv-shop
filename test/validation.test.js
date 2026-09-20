'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getPublicConfig, readConfig } = require('../backend/config');
const { ValidationError, decimalToCents, validateCheckout, validateCustomOrder } = require('../backend/validation');

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
        shippingCountries: ['US', 'CA']
    });
    assert.equal(JSON.stringify(publicConfig).includes('secret'), false);
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

test('stored decimal prices convert to integer cents without float arithmetic', () => {
    assert.equal(decimalToCents('18.00'), 1800);
    assert.equal(decimalToCents('6.5'), 650);
    assert.throws(() => decimalToCents('1.234'));
});
