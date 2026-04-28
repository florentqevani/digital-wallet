// src/routes/auth.js - Authentication routes for Flutter app

const express = require('express');
const { gatewayRequest } = require('../utils/gateway-request');

const router = express.Router();

// ── POST /api/auth/register 

router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
        }

        console.log(`📝 Register request: ${email}`);

        const response = await gatewayRequest('/api/auth/register', {
            method: 'POST',
            body: {
                email,
                password,
                name: name || '',
            },
        });

        console.log(`✓ Register response:`, response.success ? 'success' : 'failed');

        // Send response to Flutter app
        res.json(response);
    } catch (error) {
        console.error('❌ Register error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

// ── POST /api/auth/login 
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

        console.log(`🔐 Login request: ${email}`);

        // Step 1: Ask gateway to authenticate client credentials.
        const authResponse = await gatewayRequest('/api/auth/login-client', {
            method: 'POST',
            body: {
                email,
                password,
            },
        });

        console.log(`✓ Auth response:`, authResponse.success ? 'success' : 'failed');

        // If login failed, return error immediately
        if (!authResponse.success) {
            return res.status(401).json({
                success: false,
                message: authResponse.message,
            });
        }

        // Step 2: Now that we know the user exists, fetch their recent activity
        // This is an aggregation - combining multiple service calls
        let recentActivity = [];
        try {
            // Decode JWT payload to get the actor's UUID (logs are stored by id, not email)
            const jwtPayload = JSON.parse(
                Buffer.from(authResponse.token.split('.')[1], 'base64').toString()
            );
            const actorId = jwtPayload.id || email;

            const logsResponse = await gatewayRequest('/api/logs/query', {
                method: 'POST',
                body: {
                    actor_type: 'client',
                    actor_id: actorId,
                    page: 1,
                    limit: 3,
                },
            });
            recentActivity = logsResponse.logs || [];
            console.log(`✓ Fetched ${recentActivity.length} recent activities`);
        } catch (logError) {
            console.warn('⚠ Failed to fetch recent activity:', logError.message);
            // Don't fail the login if logs fail - continue without activity
        }

        // Step 3: Return combined response to Flutter app
        res.json({
            token: authResponse.token,
            role: authResponse.role,
            success: true,
            message: authResponse.message,
            recentActivity, // Shape the response specifically for Flutter
        });
    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.payload?.message || error.message,
        });
    }
});

module.exports = router;