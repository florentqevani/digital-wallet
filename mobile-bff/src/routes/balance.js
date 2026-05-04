const express = require('express');
const { gatewayRequest } = require('../utils/gateway-request');

const router = express.Router();

function extractToken(req) {
    return req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null;
}

// GET /api/balance — returns the authenticated client's own balance
router.get('/', async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorised' });

    try {
        const response = await gatewayRequest('/api/balance', {
            method: 'GET',
            token,
        });
        res.json(response);
    } catch (error) {
        console.error('❌ Get balance error:', error.message);
        res.status(error.statusCode || 500).json({
            balance: 0,
            currency: 'ALL',
            message: error.payload?.message || error.message,
        });
    }
});

// POST /api/balance/add — adds money to the authenticated client's own balance
router.post('/add', async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorised' });

    const { amount } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    try {
        const response = await gatewayRequest('/api/balance/add', {
            method: 'POST',
            body: { amount: parseFloat(amount) },
            token,
        });
        res.json(response);
    } catch (error) {
        console.error('❌ Add balance error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

module.exports = router;
