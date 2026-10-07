'use strict';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class CustomerValidationError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'CustomerValidationError';
        this.statusCode = statusCode;
    }
}

function cleanText(value, maxLength) {
    return String(value || '').trim().slice(0, maxLength);
}

function optionalText(value, maxLength) {
    const text = cleanText(value, maxLength);
    return text || null;
}

function getBearerToken(header) {
    const match = /^Bearer\s+(.+)$/i.exec(String(header || ''));
    return match ? match[1].trim() : '';
}

async function verifySupabaseCustomer(config, authorization, fetchImpl = fetch) {
    if (!config.customerAuthConfigured) {
        throw new CustomerValidationError('Customer authentication is unavailable.', 503);
    }
    const token = getBearerToken(authorization);
    if (!token) throw new CustomerValidationError('Sign in to continue.', 401);

    const response = await fetchImpl(`${config.supabaseUrl}/auth/v1/user`, {
        headers: {
            apikey: config.supabaseAnonKey,
            Authorization: `Bearer ${token}`
        },
        signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new CustomerValidationError('Your session is invalid or expired.', 401);

    const user = await response.json();
    const id = cleanText(user.id, 120);
    const email = cleanText(user.email, 254).toLowerCase();
    if (!id || !EMAIL_PATTERN.test(email)) {
        throw new CustomerValidationError('Your authenticated account is incomplete.', 401);
    }
    return { id, email };
}

function validateCustomerProfile(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new CustomerValidationError('A customer profile is required.');
    }
    const name = cleanText(body.name, 160);
    if (!name) throw new CustomerValidationError('Name is required.');

    const contactMethod = optionalText(body.contactMethod, 32);
    if (contactMethod && !['email', 'phone', 'instagram', 'discord'].includes(contactMethod)) {
        throw new CustomerValidationError('Preferred contact method is not supported.');
    }

    const profile = {
        name,
        username: optionalText(body.username, 100),
        contactMethod,
        contactInfo: optionalText(body.contactInfo, 254),
        shippingFullName: optionalText(body.shippingFullName, 160),
        shippingAddressLine1: optionalText(body.shippingAddressLine1, 200),
        shippingAddressLine2: optionalText(body.shippingAddressLine2, 200),
        shippingCity: optionalText(body.shippingCity, 120),
        shippingState: optionalText(body.shippingState, 120),
        shippingPostalCode: optionalText(body.shippingPostalCode, 40),
        shippingCountry: optionalText(body.shippingCountry, 100)
    };

    const requiredShippingFields = [
        profile.shippingFullName,
        profile.shippingAddressLine1,
        profile.shippingCity,
        profile.shippingState,
        profile.shippingPostalCode,
        profile.shippingCountry
    ];
    if (requiredShippingFields.some(Boolean) && !requiredShippingFields.every(Boolean)) {
        throw new CustomerValidationError('Complete all required shipping fields before saving.');
    }
    return profile;
}

module.exports = {
    CustomerValidationError,
    validateCustomerProfile,
    verifySupabaseCustomer
};
