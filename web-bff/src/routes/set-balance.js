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
        const { client_id, balance } = req.body;
        if (!client_id) {
            return res.status(400).json({ success: false, message: 'client_id is required' });
        }
        const response = await gatewayRequest('/api/set-balance', {
            method: 'POST',
            body: { client_id, balance },
            token: extractToken(req),
        });
        res.json(response);
    } catch (error) {
        console.error('❌ Set balance error:', error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.payload?.message || 'Failed to set balance' });
    }
});

module.exports = router;
