const express = require('express');
const { gatewayRequest } = require('../utils/gateway-request');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const token = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : '';

        const response = await gatewayRequest('/api/users', {
            method: 'GET',
            token,
        });

        res.json(response);
    } catch (error) {
        console.error('❌ Users route error:', error.message);
        res.status(error.statusCode || 500).json({
            users: [],
            message: error.payload?.message || error.message,
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : '';

        const response = await gatewayRequest(`/api/users/${req.params.id}`, {
            method: 'PUT',
            token,
            body: req.body,
        });

        res.json(response);
    } catch (error) {
        console.error('❌ Users update error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : '';

        const response = await gatewayRequest(`/api/users/${req.params.id}`, {
            method: 'DELETE',
            token,
        });

        res.json(response);
    } catch (error) {
        console.error('❌ Users delete error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

module.exports = router;