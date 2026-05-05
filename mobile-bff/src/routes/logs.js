// src/routes/logs.js - Client log routes for Flutter app

const express = require('express');
const { gatewayRequest } = require('../utils/gateway-request');

const router = express.Router();

function decodeActorId(token) {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const actorId = payload.id;
    if (!actorId) throw new Error('No id in token');
    return actorId;
}

function extractToken(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) throw Object.assign(new Error('Unauthorised'), { status: 401 });
    return token;
}

// ── GET /api/logs?page=1&limit=20
// Returns the authenticated client's own activity logs.
router.get('/', async (req, res) => {
    let token, actorId;
    try {
        token = extractToken(req);
        actorId = decodeActorId(token);
    } catch (e) {
        return res.status(e.status || 401).json({ success: false, message: e.message });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    try {
        const response = await gatewayRequest('/api/logs/query', {
            method: 'POST',
            token,
            body: { actor_type: 'client', actor_id: actorId, page, limit },
        });

        return res.json({
            logs: response.logs || [],
            page,
            limit,
            total: response.total || 0,
        });
    } catch (error) {
        console.error('❌ Logs fetch error:', error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

// ── GET /api/logs/payments?page=1&limit=20
// Returns the authenticated client's own payment logs (PAYMENT_INITIATE / PAYMENT_CONFIRM).
router.get('/payments', async (req, res) => {
    let token, actorId;
    try {
        token = extractToken(req);
        actorId = decodeActorId(token);
    } catch (e) {
        return res.status(e.status || 401).json({ success: false, message: e.message });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    try {
        const response = await gatewayRequest('/api/logs/query', {
            method: 'POST',
            token,
            body: {
                actor_type: 'client',
                actor_id: actorId,
                action: 'PAYMENT%',
                page,
                limit,
            },
        });

        return res.json({
            logs: response.logs || [],
            page,
            limit,
            total: response.total || 0,
        });
    } catch (error) {
        console.error('❌ Payment logs fetch error:', error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

module.exports = router;

