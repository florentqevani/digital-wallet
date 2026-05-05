'use strict';

const grpc = require('@grpc/grpc-js');
const { randomUUID } = require('crypto');
const rai = require('../raiAccept');
const { writeLog } = require('../log-client');

const PAID_STATUSES = new Set(['SUCCESS', 'PAID']);

// InitiatePayment
async function initiatePayment(call, callback) {
    const {
        client_id = 'unknown',
        amount,
        merchant_order_reference,
        success_url,
        fail_url,
        cancel_url,
        notification_url,
        currency = 'ALL',
        description = 'Balance top-up',
    } = call.request;

    if (!amount || amount <= 0) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'amount must be a positive number',
        });
    }

    try {
        const raiToken = await rai.authenticate();
        const orderPayload = {
            merchantOrderReference: merchant_order_reference || randomUUID(),
            amount,
            currency,
            description,
            successUrl: success_url,
            failUrl: fail_url,
            cancelUrl: cancel_url,
            notificationUrl: notification_url,
        };

        const order = await rai.createOrderEntry(raiToken, orderPayload);
        const session = await rai.createPaymentSession(
            raiToken,
            order.orderIdentification,
            orderPayload
        );

        callback(null, {
            success: true,
            message: 'Payment initiated',
            payment_form_url: session.paymentRedirectURL,
            rai_order_id: order.orderIdentification,
        });
    } catch (err) {
        console.error('[initiatePayment]', err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// ConfirmPayment
async function confirmPayment(call, callback) {
    const { rai_order_id, client_id = 'unknown' } = call.request;

    if (!rai_order_id) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'rai_order_id is required',
        });
    }

    try {
        const raiToken = await rai.authenticate();
        const orderDetails = await rai.getOrderDetails(raiToken, rai_order_id);
        const isPaid = PAID_STATUSES.has(orderDetails.status);

        writeLog({
            actor_id: client_id,
            actor_type: 'client',
            action: 'PAYMENT_COMPLETED',
            status: isPaid ? 'SUCCESS' : 'ERROR',
            message: `Order ${rai_order_id} status: ${orderDetails.status}`,
        });

        callback(null, {
            success: isPaid,
            message: isPaid
                ? 'Payment confirmed'
                : `Payment not confirmed. RaiAccept status: ${orderDetails.status}`,
            rai_order_status: orderDetails.status,
        });
    } catch (err) {
        console.error('[confirmPayment]', err.message);
        writeLog({
            actor_id: client_id,
            actor_type: 'client',
            action: 'PAYMENT_COMPLETED',
            status: 'ERROR',
            message: err.message,
        });
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

module.exports = { initiatePayment, confirmPayment };
