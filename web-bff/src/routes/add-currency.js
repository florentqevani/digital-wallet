const express = require('express');
const { gatewayRequest } = require('../utils/gateway-request');
const router = express.Router();

function extractToken(req) {
    return req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : '';
}

router.post('/', async (req, res) => {
    try {
        const { client_id, currency } = req.body;
        if (!client_id || !currency) {
            return res.status(400).json({ success: false, message: 'client_id and currency are required' });
        }
        const response = await gatewayRequest('/api/add-currency', {
            method: 'POST',
            body: { client_id, currency },
            token: extractToken(req),
        });
        res.json(response);
    }
    catch (error) {
        console.error('❌ Add currency error:', error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.payload?.message || 'Failed to add currency' });
    }
});

module.exports = router;