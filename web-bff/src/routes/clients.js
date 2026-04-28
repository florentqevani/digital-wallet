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
        console.error('❌ Clients route error:', error.message);
        res.status(error.statusCode || 500).json({
            clients: [],
            message: error.payload?.message || error.message,
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const response = await gatewayRequest(`/api/clients/${req.params.id}`, {
            method: 'PUT',
            token: extractToken(req),
            body: req.body,
        });

        res.json(response);
    } catch (error) {
        console.error('❌ Clients update error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const response = await gatewayRequest(`/api/clients/${req.params.id}`, {
            method: 'DELETE',
            token: extractToken(req),
        });

        res.json(response);
    } catch (error) {
        console.error('❌ Clients delete error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

module.exports = router;