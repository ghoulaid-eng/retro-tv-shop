'use strict';

function checkoutReleaseAction(session) {
    if (!session || session.payment_status === 'paid' || session.status === 'complete') {
        return 'hold';
    }
    if (session.status === 'expired') {
        return 'release';
    }
    return session.status === 'open' ? 'expire' : 'hold';
}

function paidOrderDisposition(order, session) {
    if (!order.stripeCheckoutSession || order.stripeCheckoutSession !== session.id) {
        throw new Error('Paid checkout event does not match the linked order session.');
    }
    const reservationWasReleased = Boolean(order.releasedAt);
    return {
        consumeInventory: !reservationWasReleased,
        markFulfilled: !reservationWasReleased,
        status: reservationWasReleased ? 'NEEDS_REVIEW' : 'PAID'
    };
}

async function sendNotificationWithoutFailingOperation(send, onError) {
    try {
        await send();
        return true;
    } catch (error) {
        onError(error);
        return false;
    }
}

module.exports = {
    checkoutReleaseAction,
    paidOrderDisposition,
    sendNotificationWithoutFailingOperation
};
