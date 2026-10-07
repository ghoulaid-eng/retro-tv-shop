'use strict';

const crypto = require('node:crypto');

const ADMIN_RESOURCE_DEFAULTS = Object.freeze({
    paymentMethods: [
        { id: 'stripe', name: 'Stripe', enabled: true, instructions: 'Pay securely during checkout.' }
    ],
    discounts: [],
    marketing: {
        announcementTitle: 'Latest Broadcast',
        announcementMessage: 'Fresh spooky drops are always brewing in the Sip of Ghoulaid shop.',
        featuredTitle: '',
        featuredMessage: ''
    },
    settings: {
        shopName: 'Sip of Ghoulaid Shop',
        homeHeadline: 'SIP OF GHOULAID',
        homeTagline: 'CREEPY • CUTE • HANDMADE • A LITTLE UNHINGED',
        shopNote: 'Visit sipofghoulaid.com for the full collection and latest releases! 👻',
        salesTaxRate: 8.25,
        shippingBaseRate: 4.99
    },
    appCenter: {
        marketingEnabled: true,
        discountsEnabled: true,
        customOrdersEnabled: true
    },
    designer: {
        productCardSize: 'cozy',
        staticEffect: true
    },
    music: {
        enabled: true,
        songs: []
    }
});

const ADMIN_RESOURCES = new Set(Object.keys(ADMIN_RESOURCE_DEFAULTS));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']);

class AdminValidationError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'AdminValidationError';
        this.statusCode = statusCode;
    }
}

function cleanText(value, maxLength = 5000) {
    return String(value || '').trim().slice(0, maxLength);
}

function cleanMoney(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : fallback;
}

function cleanInteger(value, fallback = 0) {
    const number = Number.parseInt(value, 10);
    return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function cleanStringArray(value, maxItems = 50, maxLength = 100) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(item => cleanText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function normalizeAdminProduct(value) {
    if (!value || typeof value !== 'object') {
        throw new AdminValidationError('Product must be an object.');
    }

    const name = cleanText(value.name, 160);
    const handle = cleanText(value.handle, 80).toLowerCase();
    const description = cleanText(value.description, 50_000);
    if (!name || !description || !HANDLE_PATTERN.test(handle)) {
        throw new AdminValidationError('Product name, description, and a valid URL handle are required.');
    }

    const listingPrice = cleanMoney(value.listingPrice);
    if (listingPrice <= 0) throw new AdminValidationError('Product price must be greater than zero.');

    const variants = Array.isArray(value.variantDetails) ? value.variantDetails : [];
    const normalizedVariants = variants.slice(0, 100).map((variant, index) => {
        const variantName = cleanText(variant.name, 100);
        if (!variantName) throw new AdminValidationError(`Variant ${index + 1} needs a name.`);
        return {
            id: cleanText(variant.id, 120) || undefined,
            name: variantName,
            price: cleanMoney(variant.price, listingPrice),
            stock: value.trackInventory ? cleanInteger(variant.stock) : null
        };
    });
    const loweredNames = normalizedVariants.map(variant => variant.name.toLowerCase());
    if (new Set(loweredNames).size !== loweredNames.length) {
        throw new AdminValidationError('Variant names must be unique within a product.');
    }

    return {
        id: cleanText(value.id, 120) || `product-${crypto.randomUUID()}`,
        name,
        handle,
        emoji: cleanText(value.emoji, 16) || '🛍️',
        description,
        descriptionHtml: cleanText(value.descriptionHtml, 100_000),
        categories: cleanStringArray(value.categories || value.subcategories),
        listingPrice,
        onSale: Boolean(value.onSale),
        salePrice: Boolean(value.onSale) ? cleanMoney(value.salePrice) : 0,
        shippingPrice: cleanMoney(value.shippingPrice),
        shippingWeight: cleanMoney(value.shippingWeight),
        shippingWeightUnit: ['oz', 'g', 'kg', 'lb'].includes(value.shippingWeightUnit) ? value.shippingWeightUnit : 'oz',
        packageSize: cleanText(value.packageSize, 40),
        mustShipAlone: Boolean(value.mustShipAlone),
        trackInventory: Boolean(value.trackInventory),
        stock: Boolean(value.trackInventory) ? cleanInteger(value.stock) : null,
        variantGroupName: cleanText(value.variantGroupName, 80) || 'Options',
        variantDetails: normalizedVariants,
        images: cleanStringArray(value.images, 25, 2048),
        videos: cleanStringArray(value.videos, 3, 2048),
        available: value.available !== false,
        sourceUrl: cleanText(value.sourceUrl, 2048)
    };
}

function normalizeAdminProducts(value) {
    if (!Array.isArray(value) || value.length > 500) {
        throw new AdminValidationError('Products must be an array with at most 500 entries.');
    }
    const products = value.map(normalizeAdminProduct);
    const handles = products.map(product => product.handle);
    if (new Set(handles).size !== handles.length) {
        throw new AdminValidationError('Product URL handles must be unique.');
    }
    return products;
}

function normalizeAdminResource(name, value) {
    if (!ADMIN_RESOURCES.has(name)) throw new AdminValidationError('Unknown admin resource.', 404);
    const serialized = JSON.stringify(value);
    if (serialized.length > 100_000) throw new AdminValidationError('Admin resource is too large.');
    const parsed = JSON.parse(serialized);
    if (name === 'music') {
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' || !Array.isArray(parsed.songs)) {
            throw new AdminValidationError('Music must include a songs array.');
        }
        if (parsed.songs.length > 100) {
            throw new AdminValidationError('Music can include at most 100 songs.');
        }
        const songs = parsed.songs.map((song, index) => {
            const title = cleanText(song?.title, 160);
            const artist = cleanText(song?.artist, 160);
            const url = cleanText(song?.url, 2048);
            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch {
                throw new AdminValidationError(`Song ${index + 1} needs a valid video URL.`);
            }
            if (!title || parsedUrl.protocol !== 'https:') {
                throw new AdminValidationError(`Song ${index + 1} needs a title and an HTTPS video URL.`);
            }
            return {
                id: cleanText(song?.id, 120) || `song-${crypto.randomUUID()}`,
                title,
                artist,
                url: parsedUrl.toString()
            };
        });
        if (new Set(songs.map(song => song.id)).size !== songs.length) {
            throw new AdminValidationError('Song IDs must be unique.');
        }
        return { enabled: parsed.enabled !== false, songs };
    }
    if (name === 'discounts' && !Array.isArray(parsed)) throw new AdminValidationError('Discounts must be an array.');
    if (name === 'paymentMethods' && !Array.isArray(parsed)) throw new AdminValidationError('Payment methods must be an array.');
    if (!['discounts', 'paymentMethods'].includes(name) && (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')) {
        throw new AdminValidationError(`${name} must be an object.`);
    }
    return parsed;
}

function getBearerToken(header) {
    const match = /^Bearer\s+(.+)$/i.exec(String(header || ''));
    return match ? match[1].trim() : '';
}

async function verifySupabaseAdmin(config, authorization, fetchImpl = fetch) {
    if (!config.adminAuthConfigured) {
        throw new AdminValidationError('Production admin authentication is not configured.', 503);
    }
    const token = getBearerToken(authorization);
    if (!token) throw new AdminValidationError('Sign in is required.', 401);

    const response = await fetchImpl(`${config.supabaseUrl}/auth/v1/user`, {
        headers: {
            apikey: config.supabaseAnonKey,
            Authorization: `Bearer ${token}`
        },
        signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new AdminValidationError('Your admin session is invalid or expired.', 401);

    const user = await response.json();
    const email = cleanText(user.email, 320).toLowerCase();
    if (!EMAIL_PATTERN.test(email) || !config.adminEmails.includes(email)) {
        throw new AdminValidationError('This account is not authorized for production admin access.', 403);
    }
    return { id: cleanText(user.id, 120), email };
}

function validateMediaUpload(contentType, contentLength) {
    if (!MEDIA_TYPES.has(contentType)) throw new AdminValidationError('Unsupported media type.');
    if (!Number.isInteger(contentLength) || contentLength <= 0 || contentLength > 15 * 1024 * 1024) {
        throw new AdminValidationError('Media must be between 1 byte and 15 MB.');
    }
}

module.exports = {
    ADMIN_RESOURCES,
    ADMIN_RESOURCE_DEFAULTS,
    AdminValidationError,
    normalizeAdminProducts,
    normalizeAdminResource,
    validateMediaUpload,
    verifySupabaseAdmin
};
