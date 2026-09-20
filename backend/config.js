'use strict';

const ISO_COUNTRY = /^[A-Z]{2}$/;
const SHIPPING_RATE = /^shr_[A-Za-z0-9_]+$/;

function splitList(value) {
    return String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

function readConfig(env = process.env) {
    const allowedCountries = splitList(env.STRIPE_ALLOWED_SHIPPING_COUNTRIES)
        .map(country => country.toUpperCase())
        .filter(country => ISO_COUNTRY.test(country));
    const shippingRateIds = splitList(env.STRIPE_SHIPPING_RATE_IDS)
        .filter(id => SHIPPING_RATE.test(id))
        .slice(0, 5);
    const reservationMinutes = Number.parseInt(env.RESERVATION_MINUTES || '31', 10);

    return {
        port: Number.parseInt(env.PORT || '3000', 10),
        publicUrl: String(env.PUBLIC_URL || `http://localhost:${env.PORT || 3000}`).replace(/\/+$/, ''),
        trustProxy: env.TRUST_PROXY === 'true',
        databaseConfigured: Boolean(env.DATABASE_URL),
        stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
        webhookConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET),
        allowedCountries: allowedCountries.length ? allowedCountries : ['US'],
        shippingRateIds,
        reservationMinutes: Number.isInteger(reservationMinutes)
            ? Math.min(Math.max(reservationMinutes, 31), 1440)
            : 31
    };
}

function getPublicConfig(config) {
    const checkoutAvailable = config.databaseConfigured
        && config.stripeConfigured
        && config.webhookConfigured
        && config.shippingRateIds.length > 0;

    return {
        mode: checkoutAvailable ? 'production-commerce' : 'limited',
        databaseAvailable: config.databaseConfigured,
        catalogAvailable: config.databaseConfigured,
        customOrdersAvailable: config.databaseConfigured,
        checkoutAvailable,
        shippingCountries: checkoutAvailable ? config.allowedCountries : []
    };
}

module.exports = { getPublicConfig, readConfig, splitList };
