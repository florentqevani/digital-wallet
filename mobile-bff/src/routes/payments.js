'use strict';

const express = require('express');
const { randomUUID } = require('crypto');
const rai = require('../utils/raiaccept');
const { gatewayRequest } = require('../utils/gateway-request');
const config = require('../config');

const router = express.Router();

// Statuses that mean the card was successfully charged
const PAID_STATUSES = new Set(['SUCCESS', 'PAID']);

function extractToken(req) {
    return req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null;
}

// ─── POST /api/payments/initiate ─────────────────────────────────────────────
// Authenticates with RaiAccept, creates an order + checkout session,
// and returns the hosted payment form URL + order ID to Flutter.
router.post('/initiate', async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorised' });

    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    try {
        const raiToken = await rai.authenticate();
        const merchantOrderReference = randomUUID();

        const orderPayload = {
            merchantOrderReference,
            amount,
            currency: 'ALL',
            description: `Balance top-up: ${amount.toFixed(2)} ALL`,
            successUrl: `${config.raiaccept.mobileCallbackBase}/success`,
            failUrl: `${config.raiaccept.mobileCallbackBase}/fail`,
            cancelUrl: `${config.raiaccept.mobileCallbackBase}/cancel`,
            notificationUrl: `${config.raiaccept.webhookUrl}/api/payments/webhook`,
        };

        const order = await rai.createOrderEntry(raiToken, orderPayload);
        const session = await rai.createPaymentSession(raiToken, order.orderIdentification, orderPayload);

        res.json({
            paymentFormUrl: session.paymentRedirectURL,
            raiOrderId: order.orderIdentification,
        });
    } catch (err) {
        console.error('[payments/initiate]', err.message);
        res.status(502).json({ success: false, message: 'Could not initiate payment. Please try again.' });
    }
});

// ─── POST /api/payments/confirm ───────────────────────────────────────────────
// Called after the Flutter WebView intercepts the successUrl redirect.
// Verifies the payment with RaiAccept, then credits the client's balance.
router.post('/confirm', async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorised' });

    const { raiOrderId, amount } = req.body;
    if (!raiOrderId || !amount) {
        return res.status(400).json({ success: false, message: 'raiOrderId and amount are required' });
    }

    try {
        // 1. Verify that RaiAccept actually charged the card
        const raiToken = await rai.authenticate();
        const orderDetails = await rai.getOrderDetails(raiToken, raiOrderId);

        if (!PAID_STATUSES.has(orderDetails.status)) {
            return res.status(402).json({
                success: false,
                message: `Payment not confirmed. RaiAccept order status: ${orderDetails.status}`,
            });
        }

        // 2. Credit the client's balance via the api-gateway (JWT identifies the client)
        const balanceResponse = await gatewayRequest('/api/balance/add', {
            method: 'POST',
            body: { amount: parseFloat(amount) },
            token,
        });

        res.json(balanceResponse);
    } catch (err) {
        console.error('[payments/confirm]', err.message);
        res.status(502).json({ success: false, message: err.message });
    }
});

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// RaiAccept server-to-server notification — logs and responds 200 immediately.
// The Flutter WebView URL-intercept is the primary confirmation path.
router.post('/webhook', (req, res) => {
    console.log('[payments/webhook] notification received:', JSON.stringify(req.body));
    res.sendStatus(200);
});

module.exports = router;
