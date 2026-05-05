// src/routes/logs.js - Logging passthrough routes

const express = require('express');
const { logClient } = require('../grpc-clients');
const { apiLimiter } = require('../middleware/rate-limiter');
const { promisifyGRPC } = require('../utils/promise-wrapper');
const { validateJWT } = require('../middleware/jwt-validator');

const router = express.Router();

// POST /logs/write
router.post('/write', apiLimiter, async (req, res) => {
    try {
        const { actor_id, actor_type, action, status, message, timestamp } = req.body;

        if (!actor_id || !actor_type || !action || !status) {
            return res.status(400).json({
                saved: false,
                message: 'actor_id, actor_type, action, and status are required',
            });
        }

        const response = await promisifyGRPC(logClient.WriteLog.bind(logClient), {
            actor_id,
            actor_type,
            action,
            status,
            message: message || '',
            timestamp: timestamp || Date.now(),
        });

        return res.json(response);
    } catch (error) {
        console.error('Write log error:', error.message);
        return res.status(500).json({
            saved: false,
            message: error.message,
        });
    }
});

// POST /logs/query
router.post('/query', apiLimiter, async (req, res) => {
    try {
        const { actor_type, actor_id, from, to, page = 1, limit = 50 } = req.body;

        const response = await promisifyGRPC(logClient.QueryLogs.bind(logClient), {
            actor_type: actor_type || '',
            actor_id: actor_id || '',
            action: req.body.action || '',
            from: from ? Number.parseInt(from, 10) : 0,
            to: to ? Number.parseInt(to, 10) : 0,
            page: Number.parseInt(page, 10) || 1,
            limit: Math.min(Number.parseInt(limit, 10) || 50, 100),
        });

        return res.json(response);
    } catch (error) {
        console.error('Query logs error:', error.message);
        return res.status(500).json({
            logs: [],
            total: 0,
            message: error.message,
        });
    }
});

// GET /logs/my-logs
router.get('/my-logs', validateJWT(['user', 'superadmin']), async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const response = await promisifyGRPC(logClient.QueryLogs.bind(logClient), {
            actor_type: req.user.role,
            actor_id: req.user.user_id,
            page: Number.parseInt(page, 10) || 1,
            limit: Math.min(Number.parseInt(limit, 10) || 20, 100),
        });

        return res.json(response);
    } catch (error) {
        console.error('Error fetching my-logs:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch logs',
            message: error.message,
        });
    }
});

// GET /logs/dashboard
router.get('/dashboard', validateJWT(['user', 'superadmin']), async (req, res) => {
    try {
        if (req.user.role === 'user') {
            const [ownLogsResponse, clientLogsResponse] = await Promise.all([
                promisifyGRPC(logClient.QueryLogs.bind(logClient), {
                    actor_type: 'user',
                    actor_id: req.user.user_id,
                    page: 1,
                    limit: 10,
                }),
                promisifyGRPC(logClient.QueryLogs.bind(logClient), {
                    actor_type: 'client',
                    page: 1,
                    limit: 10,
                }),
            ]);

            const ownLogs = ownLogsResponse.logs || [];
            const clientLogs = clientLogsResponse.logs || [];
            const allLogs = [...ownLogs, ...clientLogs];
            const errorCount = allLogs.filter((log) => log.status === 'ERROR').length;
            const successCount = allLogs.filter((log) => log.status === 'SUCCESS').length;

            return res.json({
                clientLogs,
                userLogs: ownLogs,
                summary: {
                    totalClientLogs: clientLogsResponse.total || 0,
                    totalUserLogs: ownLogsResponse.total || 0,
                    errorCount,
                    successCount,
                },
            });
        }

        const [clientLogsResponse, userLogsResponse, superadminLogsResponse] = await Promise.all([
            promisifyGRPC(logClient.QueryLogs.bind(logClient), {
                actor_type: 'client',
                page: 1,
                limit: 10,
            }),
            promisifyGRPC(logClient.QueryLogs.bind(logClient), {
                actor_type: 'user',
                page: 1,
                limit: 10,
            }),
            promisifyGRPC(logClient.QueryLogs.bind(logClient), {
                actor_type: 'superadmin',
                page: 1,
                limit: 10,
            }),
        ]);

        const clientLogs = clientLogsResponse.logs || [];
        const combinedUserLogs = [
            ...(userLogsResponse.logs || []),
            ...(superadminLogsResponse.logs || []),
        ]
            .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
            .slice(0, 10);

        const allLogs = [
            ...clientLogs,
            ...(userLogsResponse.logs || []),
            ...(superadminLogsResponse.logs || []),
        ];
        const errorCount = allLogs.filter((log) => log.status === 'ERROR').length;
        const successCount = allLogs.filter((log) => log.status === 'SUCCESS').length;

        return res.json({
            clientLogs,
            userLogs: combinedUserLogs,
            summary: {
                totalClientLogs: clientLogsResponse.total || 0,
                totalUserLogs: (userLogsResponse.total || 0) + (superadminLogsResponse.total || 0),
                errorCount,
                successCount,
            },
        });
    } catch (error) {
        console.error('Error fetching dashboard:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch dashboard',
            message: error.message,
        });
    }
});

// GET /logs/all
router.get('/all', validateJWT(['user', 'superadmin']), async (req, res) => {
    try {
        const { actor_type, actor_id, from, to, page = 1, limit = 50 } = req.query;

        const scopedActorType = (req.user.role === 'user' && actor_type !== 'client')
            ? 'user'
            : (actor_type || '');
        const scopedActorId = (req.user.role === 'user' && actor_type !== 'client')
            ? req.user.user_id
            : (actor_id || '');

        const response = await promisifyGRPC(logClient.QueryLogs.bind(logClient), {
            actor_type: scopedActorType,
            actor_id: scopedActorId,
            action: req.query.action || '',
            from: from ? Number.parseInt(from, 10) : 0,
            to: to ? Number.parseInt(to, 10) : 0,
            page: Number.parseInt(page, 10) || 1,
            limit: Math.min(Number.parseInt(limit, 10) || 50, 100),
        });

        return res.json(response);
    } catch (error) {
        console.error('Error fetching all logs:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch logs',
            message: error.message,
        });
    }
});

// GET /logs/payments
// Back-office: superadmin sees all clients' payment logs; user sees only their assigned clients.
// Optional query params: actor_id, from, to, page, limit
router.get('/payments', validateJWT(['user', 'superadmin']), async (req, res) => {
    try {
        const { actor_id, from, to, page = 1, limit = 50 } = req.query;

        const response = await promisifyGRPC(logClient.QueryLogs.bind(logClient), {
            actor_type: 'client',
            actor_id: actor_id || '',
            action: 'PAYMENT%',
            from: from ? Number.parseInt(from, 10) : 0,
            to: to ? Number.parseInt(to, 10) : 0,
            page: Number.parseInt(page, 10) || 1,
            limit: Math.min(Number.parseInt(limit, 10) || 50, 100),
        });

        return res.json(response);
    } catch (error) {
        console.error('Error fetching payment logs:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch payment logs',
            message: error.message,
        });
    }
});

module.exports = router;
