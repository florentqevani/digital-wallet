'use strict';

const express = require('express');
const { gatewayRequest } = require('../utils/gateway-request');
const config = require('../config');

const router = express.Router();

function extractToken(req) {
    return req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null;
}

// ─── POST /api/payments/initiate ─────────────────────────────────────────────
// Forwards to API Gateway → Payment Service → RaiAccept.
// Returns { paymentFormUrl, raiOrderId } for the Flutter WebView.
router.post('/initiate', async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorised' });

    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    try {
        const response = await gatewayRequest('/api/payments/initiate', {
            method: 'POST',
            body: {
                amount,
                success_url: `${config.raiaccept.mobileCallbackBase}/success`,
                fail_url: `${config.raiaccept.mobileCallbackBase}/fail`,
                cancel_url: `${config.raiaccept.mobileCallbackBase}/cancel`,
                notification_url: `${config.raiaccept.webhookUrl}/api/payments/webhook`,
            },
            token,
        });
        res.json(response);
    } catch (err) {
        console.error('[payments/initiate]', err.message);
        res.status(err.statusCode || 502).json({
            success: false,
            message: 'Could not initiate payment. Please try again.',
        });
    }
});

// ─── POST /api/payments/confirm ───────────────────────────────────────────────
// Forwards to API Gateway which verifies with RaiAccept and credits balance.
router.post('/confirm', async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorised' });

    const { raiOrderId, amount } = req.body;
    if (!raiOrderId || !amount) {
        return res.status(400).json({ success: false, message: 'raiOrderId and amount are required' });
    }

    try {
        const response = await gatewayRequest('/api/payments/confirm', {
            method: 'POST',
            body: { raiOrderId, amount: parseFloat(amount) },
            token,
        });
        res.json(response);
    } catch (err) {
        console.error('[payments/confirm]', err.message);
        res.status(err.statusCode || 502).json({ success: false, message: err.message });
    }
});

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// RaiAccept server-to-server notification — logs and responds 200 immediately.
router.post('/webhook', (req, res) => {
    console.log('[payments/webhook] notification received:', JSON.stringify(req.body));
    res.sendStatus(200);
});

// ─── POST /api/payments/transfer ─────────────────────────────────────────────
// Client sends funds to another client by recipient email.
// Body: { to_email, amount, note? }
router.post('/transfer', async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorised' });

    const { to_email, note } = req.body;
    const amount = parseFloat(req.body.amount);

    if (!to_email || typeof to_email !== 'string' || !to_email.includes('@')) {
        return res.status(400).json({ success: false, message: 'to_email must be a valid email address' });
    }
    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    try {
        const response = await gatewayRequest('/api/payments/transfer-by-email', {
            method: 'POST',
            body: { to_email: to_email.trim(), amount, note: note || '' },
            token,
        });
        res.json(response);
    } catch (err) {
        console.error('[payments/transfer]', err.message);
        res.status(err.statusCode || 502).json({
            success: false,
            message: err.message || 'Transfer failed',
        });
    }
});

// ─── GET /api/payments/balance ────────────────────────────────────────────────
// Returns the authenticated client's own wallet balance.
router.get('/balance', async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorised' });

    try {
        const response = await gatewayRequest('/api/payments/balance', { token });
        res.json(response);
    } catch (err) {
        console.error('[payments/balance]', err.message);
        res.status(err.statusCode || 502).json({ success: false, message: err.message });
    }
});

// ─── GET /api/payments/history ────────────────────────────────────────────────
// Returns the authenticated client's paginated transaction history.
// Query: limit, offset
router.get('/history', async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorised' });

    try {
        const response = await gatewayRequest('/api/payments/history', {
            token,
            query: {
                limit: req.query.limit || '20',
                offset: req.query.offset || '0',
            },
        });
        res.json(response);
    } catch (err) {
        console.error('[payments/history]', err.message);
        res.status(err.statusCode || 502).json({ success: false, transactions: [], total: 0, message: err.message });
    }
});

module.exports = router;

