'use strict';

const express = require('express');
const { randomUUID } = require('crypto');
const { paymentClient, userClient } = require('../grpc-clients');
const { validateJWT } = require('../middleware/jwt-validator');
const { promisifyGRPC } = require('../utils/promise-wrapper');

const router = express.Router();

// ── POST /api/payments/initiate ───────────────────────────────────────────────
// Delegates to payment-service via gRPC to authenticate with RaiAccept,
// create the order + checkout session, and return the hosted payment URL.
router.post('/initiate', validateJWT(['client', 'user', 'superadmin']), async (req, res) => {
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    const {
        success_url = '',
        fail_url = '',
        cancel_url = '',
        notification_url = '',
        currency = 'ALL',
        description,
    } = req.body;

    try {
        const response = await promisifyGRPC(
            paymentClient.InitiatePayment.bind(paymentClient),
            {
                client_id: req.user.user_id,
                amount,
                merchant_order_reference: randomUUID(),
                success_url,
                fail_url,
                cancel_url,
                notification_url,
                currency,
                description: description || `Balance top-up: ${amount.toFixed(2)} ALL`,
            }
        );

        if (!response.success) {
            return res.status(502).json({ success: false, message: response.message });
        }

        res.json({
            paymentFormUrl: response.payment_form_url,
            raiOrderId: response.rai_order_id,
        });
    } catch (err) {
        console.error('❌ Payment initiate error:', err.message);
        res.status(502).json({ success: false, message: 'Could not initiate payment' });
    }
});

// ── POST /api/payments/confirm ────────────────────────────────────────────────
// Verifies the RaiAccept payment status via payment-service, then credits
// the authenticated client's balance.
router.post('/confirm', validateJWT(['client', 'user', 'superadmin']), async (req, res) => {
    const { raiOrderId, amount } = req.body;
    if (!raiOrderId || !amount) {
        return res.status(400).json({ success: false, message: 'raiOrderId and amount are required' });
    }

    try {
        // 1. Verify payment with payment-service
        const paymentResponse = await promisifyGRPC(
            paymentClient.ConfirmPayment.bind(paymentClient),
            { rai_order_id: raiOrderId, client_id: req.user.user_id }
        );

        if (!paymentResponse.success) {
            return res.status(402).json({ success: false, message: paymentResponse.message });
        }

        // 2. Credit the client's balance
        const balanceResponse = await promisifyGRPC(
            userClient.AddBalance.bind(userClient),
            { client_id: req.user.user_id, amount: parseFloat(amount) }
        );

        res.json(balanceResponse);
    } catch (err) {
        console.error('❌ Payment confirm error:', err.message);
        res.status(502).json({ success: false, message: err.message });
    }
});

module.exports = router;
