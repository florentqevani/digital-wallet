// src/routes/logs.js - Client log routes for Flutter app

const express = require('express');
const { gatewayRequest } = require('../utils/gateway-request');

const router = express.Router();

// ── GET /api/logs?page=1&limit=20
// Returns the authenticated client's own logs.
// Requires Authorization: Bearer <token>
router.get('/', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorised' });
    }

    // Decode JWT payload (no verification needed — gateway will verify on the query call)
    let actorId;
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        actorId = payload.id;
        if (!actorId) throw new Error('No id in token');
    } catch {
        return res.status(401).json({ success: false, message: 'Invalid token' });
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
        console.error('❌ Logs fetch error:', error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

module.exports = router;
