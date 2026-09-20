'use strict';

class ValidationError extends Error {
    constructor(message, details = []) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.details = details;
    }
}

function requiredText(value, name, maxLength) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) {
        throw new ValidationError(`${name} is required.`);
    }
    if (text.length > maxLength) {
        throw new ValidationError(`${name} must be ${maxLength} characters or fewer.`);
    }
    return text;
}

function optionalText(value, name, maxLength) {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const text = String(value).trim();
    if (text.length > maxLength) {
        throw new ValidationError(`${name} must be ${maxLength} characters or fewer.`);
    }
    return text || null;
}

function validateCheckout(body) {
    if (!body || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
        throw new ValidationError('Cart must contain between 1 and 50 line items.');
    }

    const items = body.items.map((item, index) => {
        const productId = requiredText(item?.productId, `items[${index}].productId`, 100);
        const variant = optionalText(item?.variant, `items[${index}].variant`, 120);
        const quantity = Number(item?.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
            throw new ValidationError(`items[${index}].quantity must be an integer from 1 to 10.`);
        }
        return { productId, variant, quantity };
    });

    const email = optionalText(body.email, 'email', 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ValidationError('email must be a valid email address.');
    }
    return { items, email };
}

function validateCustomOrder(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new ValidationError('A JSON custom-order request is required.');
    }

    const contactMethod = requiredText(body.contactMethod, 'contactMethod', 32).toLowerCase();
    if (!['email', 'phone', 'instagram', 'discord'].includes(contactMethod)) {
        throw new ValidationError('contactMethod is not supported.');
    }

    const customizationLevel = requiredText(body.customizationLevel, 'customizationLevel', 80);
    if (!['minimal', 'detailed', 'exclusive'].includes(customizationLevel)) {
        throw new ValidationError('customizationLevel is not supported.');
    }
    const description = requiredText(body.description, 'description', 5000);
    const contactInfo = requiredText(body.contactInfo, 'contactInfo', 254);
    if (contactMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo)) {
        throw new ValidationError('contactInfo must be a valid email address.');
    }
    if (Array.isArray(body.scents) && body.scents.length > 20) {
        throw new ValidationError('scents must contain 20 choices or fewer.');
    }
    const scents = Array.isArray(body.scents)
        ? body.scents.map((scent, index) => requiredText(scent, `scents[${index}]`, 100))
        : [];
    const additionalSets = optionalText(body.additionalSets, 'additionalSets', 20);
    if (additionalSets && !['yes', 'no'].includes(additionalSets)) {
        throw new ValidationError('additionalSets must be yes or no.');
    }
    const additionalSetCount = optionalText(body.additionalSetCount, 'additionalSetCount', 20);
    if (additionalSets === 'yes'
        && (!/^\d+$/.test(additionalSetCount || '')
            || Number(additionalSetCount) < 1
            || Number(additionalSetCount) > 10)) {
        throw new ValidationError('additionalSetCount must be an integer from 1 to 10.');
    }

    return {
        fullName: requiredText(body.fullName, 'fullName', 160),
        username: requiredText(body.username, 'username', 100),
        contactMethod,
        contactInfo,
        customizationLevel,
        description,
        refImages: optionalText(body.refImages, 'refImages', 2000),
        colors: optionalText(body.colors, 'colors', 1000),
        handPaintedDetails: optionalText(body.handPaintedDetails, 'handPaintedDetails', 2000),
        scents,
        glitter: body.glitter === true,
        glow: body.glow === true,
        additionalSets,
        additionalSetCount,
        deadline: optionalText(body.deadline, 'deadline', 100),
        additionalInfo: optionalText(body.additionalInfo, 'additionalInfo', 3000),
        paymentMethod: optionalText(body.paymentMethod, 'paymentMethod', 80)
    };
}

function decimalToCents(value) {
    const normalized = String(value);
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
        throw new Error('Invalid stored monetary amount.');
    }
    const [whole, fraction = ''] = normalized.split('.');
    return (Number(whole) * 100) + Number(fraction.padEnd(2, '0'));
}

module.exports = { ValidationError, decimalToCents, validateCheckout, validateCustomOrder };
