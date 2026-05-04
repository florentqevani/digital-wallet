const express = require('express');
const { gatewayRequest } = require('../utils/gateway-request');

const router = express.Router();

function extractToken(req) {
    return req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : '';
}

router.get('/', async (req, res) => {
    try {
        const response = await gatewayRequest('/api/clients', {
            method: 'GET',
            token: extractToken(req),
        });
        res.json(response);
    } catch (error) {
        console.error('❌ Accounts route error:', error.message);
        res.status(error.statusCode || 500).json({
            clients: [],
            message: error.payload?.message || error.message,
        });
    }
});

module.exports = router;
