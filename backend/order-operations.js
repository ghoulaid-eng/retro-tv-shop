'use strict';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https:\/\/[^\s]+$/i;

class OrderOperationError extends Error {
    constructor(message, statusCode = 400, code = 'ORDER_OPERATION_ERROR') {
        super(message);
        this.name = 'OrderOperationError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

function cleanText(value, maxLength, field, required = false) {
    const text = String(value || '').trim();
    if (required && !text) throw new OrderOperationError(`${field} is required.`);
    if (text.length > maxLength) throw new OrderOperationError(`${field} is too long.`);
    return text;
}

function validateFulfillment(input = {}) {
    const status = cleanText(input.status, 30, 'Fulfillment status', true).toUpperCase();
    if (!['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status)) {
        throw new OrderOperationError('Fulfillment status must be PROCESSING, SHIPPED, or DELIVERED.');
    }
    const trackingCarrier = cleanText(input.trackingCarrier, 100, 'Tracking carrier');
    const trackingNumber = cleanText(input.trackingNumber, 200, 'Tracking number');
    const trackingUrl = cleanText(input.trackingUrl, 1000, 'Tracking URL');
    if (status === 'SHIPPED' && !trackingNumber) {
        throw new OrderOperationError('A tracking number is required when an order ships.');
    }
    if (trackingUrl && !URL_PATTERN.test(trackingUrl)) {
        throw new OrderOperationError('Tracking URL must be a valid HTTPS URL.');
    }
    return { status, trackingCarrier, trackingNumber, trackingUrl };
}

function validateReason(input = {}) {
    return { reason: cleanText(input.reason, 1000, 'Reason', true) };
}

function validateRefund(input = {}) {
    const reason = cleanText(input.reason, 1000, 'Refund reason', true);
    const amount = input.amount === undefined || input.amount === null || input.amount === ''
        ? null
        : Number(input.amount);
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount * 100))) {
        throw new OrderOperationError('Refund amount must be a positive amount with at most two decimal places.');
    }
    return { reason, amount };
}

function validateSupport(input = {}) {
    const email = cleanText(input.email, 320, 'Email', true).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) throw new OrderOperationError('A valid email is required.');
    return {
        orderId: cleanText(input.orderId, 120, 'Order ID', true),
        email,
        message: cleanText(input.message, 4000, 'Message', true)
    };
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function orderEmailContent(type, order, details = {}) {
    const orderId = escapeHtml(order.id);
    const support = details.supportEmail
        ? `<p>Need help? Email <a href="mailto:${escapeHtml(details.supportEmail)}">${escapeHtml(details.supportEmail)}</a>.</p>`
        : '';
    const templates = {
        confirmation: ['Order confirmed', 'Your payment was received and your order is confirmed.'],
        processing: ['Your order is being prepared', 'Your order is now being prepared in the ghoul lab.'],
        shipped: ['Your order has shipped', `Your order shipped${details.trackingCarrier ? ` with ${escapeHtml(details.trackingCarrier)}` : ''}.`],
        delivered: ['Your order was delivered', 'Your order has been marked delivered.'],
        canceled: ['Your order was canceled', `Your order was canceled. Reason: ${escapeHtml(details.reason || 'Not provided')}`],
        refunded: ['Your refund was issued', `A refund of ${escapeHtml(details.amount || '')} was issued to your original payment method.`]
    };
    const [subject, message] = templates[type] || ['Order update', 'There is an update to your order.'];
    const tracking = details.trackingNumber
        ? `<p><strong>Tracking:</strong> ${escapeHtml(details.trackingNumber)}${details.trackingUrl ? ` — <a href="${escapeHtml(details.trackingUrl)}">Track package</a>` : ''}</p>`
        : '';
    return {
        subject: `${subject} — ${order.id}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px"><h1>${subject}</h1><p>${message}</p><p><strong>Order:</strong> ${orderId}</p>${tracking}${support}</div>`
    };
}

async function sendResendEmail(config, message, fetchImpl = fetch) {
    if (!config.emailConfigured) {
        throw new OrderOperationError('Transactional email is not configured.', 503, 'EMAIL_NOT_CONFIGURED');
    }
    const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: config.orderEmailFrom, ...message }),
        signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) {
        const body = await response.text();
        console.error('Resend email failed:', response.status, body);
        throw new OrderOperationError('Transactional email could not be delivered.', 502, 'EMAIL_DELIVERY_FAILED');
    }
    return response.json();
}

module.exports = {
    OrderOperationError,
    orderEmailContent,
    sendResendEmail,
    validateFulfillment,
    validateReason,
    validateRefund,
    validateSupport
};
