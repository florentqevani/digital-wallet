// src/routes/auth.js - Authentication routes for back-office web app

const express = require('express');
const { gatewayRequest } = require('../utils/gateway-request');

const router = express.Router();


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
        }

        console.log(`🔐 Back-office login request: ${email}`);

        const response = await gatewayRequest('/api/auth/login', {
            method: 'POST',
            body: {
                email,
                password,
            },
        });

        console.log(`✓ Login response:`, response.success ? `success (${response.role})` : 'failed');

        // Send response to web app
        res.json(response);
    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

router.post('/register-user', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
        }

        const token = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : '';

        const response = await gatewayRequest('/api/auth/register-user', {
            method: 'POST',
            token,
            body: {
                email,
                password,
                name: name || '',
                role: role || 'user',
            },
        });

        res.json(response);
    } catch (error) {
        console.error('❌ Register user error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

router.get('/users', async (req, res) => {
    try {
        const token = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : '';

        const response = await gatewayRequest('/api/auth/users', {
            method: 'GET',
            token,
        });
        res.json(response);
    } catch (error) {
        console.error('❌ List users error:', error.message);
        res.status(error.statusCode || 500).json({
            users: [],
            message: error.payload?.message || error.message,
        });
    }
});

module.exports = router;