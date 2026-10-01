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
    const freeShippingThresholdCents = Number.parseInt(env.FREE_SHIPPING_THRESHOLD_CENTS || '5000', 10);
    const adminEmails = splitList(env.ADMIN_EMAIL_ALLOWLIST).map(email => email.toLowerCase());
    const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/+$/, '');

    return {
        port: Number.parseInt(env.PORT || '3000', 10),
        publicUrl: String(
            env.PUBLIC_URL
            || env.RENDER_EXTERNAL_URL
            || `http://localhost:${env.PORT || 3000}`
        ).replace(/\/+$/, ''),
        trustProxy: env.TRUST_PROXY === 'true',
        databaseConfigured: Boolean(env.DATABASE_URL),
        stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
        webhookConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET),
        resendApiKey: String(env.RESEND_API_KEY || ''),
        orderEmailFrom: String(env.ORDER_EMAIL_FROM || ''),
        supportEmail: String(env.SUPPORT_EMAIL || 'support@sipofghoulaid.com'),
        emailConfigured: Boolean(env.RESEND_API_KEY && env.ORDER_EMAIL_FROM),
        supabaseUrl,
        supabaseAnonKey: String(env.SUPABASE_ANON_KEY || ''),
        supabaseServiceRoleKey: String(env.SUPABASE_SERVICE_ROLE_KEY || ''),
        supabaseStorageBucket: String(env.SUPABASE_STORAGE_BUCKET || 'product-media'),
        adminEmails,
        adminAuthConfigured: Boolean(
            supabaseUrl
            && env.SUPABASE_ANON_KEY
            && env.SUPABASE_SERVICE_ROLE_KEY
            && adminEmails.length
            && env.DATABASE_URL
        ),
        allowedCountries: allowedCountries.length ? allowedCountries : ['US'],
        shippingRateIds,
        automaticTaxEnabled: env.STRIPE_AUTOMATIC_TAX_ENABLED !== 'false',
        stripeDefaultTaxCode: String(env.STRIPE_DEFAULT_TAX_CODE || 'txcd_99999999').trim(),
        freeShippingThresholdCents: Number.isInteger(freeShippingThresholdCents) && freeShippingThresholdCents >= 0
            ? freeShippingThresholdCents
            : 5000,
        localPickupEnabled: env.LOCAL_PICKUP_ENABLED !== 'false',
        localPickupName: String(env.LOCAL_PICKUP_NAME || 'Local pickup — Redlands, CA').trim()
            || 'Local pickup — Redlands, CA',
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
        orderEmailsAvailable: config.emailConfigured,
        adminAuthAvailable: config.adminAuthConfigured,
        supabaseUrl: config.adminAuthConfigured ? config.supabaseUrl : '',
        supabaseAnonKey: config.adminAuthConfigured ? config.supabaseAnonKey : '',
        shippingCountries: checkoutAvailable ? config.allowedCountries : [],
        automaticTaxEnabled: checkoutAvailable && config.automaticTaxEnabled,
        freeShippingThresholdCents: config.freeShippingThresholdCents,
        localPickupAvailable: checkoutAvailable && config.localPickupEnabled
    };
}

module.exports = { getPublicConfig, readConfig, splitList };
