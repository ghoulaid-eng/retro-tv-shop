'use strict';

const MAX_STRIPE_SHIPPING_OPTIONS = 5;

function freeRate(displayName, deliveryEstimate) {
    return {
        shipping_rate_data: {
            type: 'fixed_amount',
            display_name: displayName,
            fixed_amount: { amount: 0, currency: 'usd' },
            tax_behavior: 'exclusive',
            ...(deliveryEstimate ? { delivery_estimate: deliveryEstimate } : {})
        }
    };
}

function buildCheckoutShippingOptions(subtotalCents, config) {
    if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
        throw new TypeError('Subtotal must be a non-negative integer amount in cents.');
    }

    const options = [];
    if (subtotalCents >= config.freeShippingThresholdCents) {
        options.push(freeRate('Free USPS standard shipping', {
            minimum: { unit: 'business_day', value: 3 },
            maximum: { unit: 'business_day', value: 7 }
        }));
    } else {
        const carrierLimit = config.localPickupEnabled
            ? MAX_STRIPE_SHIPPING_OPTIONS - 1
            : MAX_STRIPE_SHIPPING_OPTIONS;
        options.push(...config.shippingRateIds
            .slice(0, carrierLimit)
            .map(shippingRate => ({ shipping_rate: shippingRate })));
    }

    if (config.localPickupEnabled) {
        options.push(freeRate(config.localPickupName));
    }

    return options.slice(0, MAX_STRIPE_SHIPPING_OPTIONS);
}

module.exports = { buildCheckoutShippingOptions };
