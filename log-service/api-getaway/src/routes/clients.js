const express = require('express');
const { userClient } = require('../grpc-clients');
const { validateJWT } = require('../middleware/jwt-validator');
const { promisifyGRPC } = require('../utils/promise-wrapper');

const router = express.Router();

router.get('/', validateJWT(['user', 'superadmin']), async (req, res) => {
    try {
        const response = await promisifyGRPC(userClient.ListClients.bind(userClient), {});
        res.json(response);
    } catch (error) {
        console.error('❌ Client list error:', error.message);
        res.status(500).json({
            clients: [],
            message: error.message,
        });
    }
});

router.put('/:id', validateJWT(['user', 'superadmin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name, password } = req.body;

        const response = await promisifyGRPC(userClient.UpdateClient.bind(userClient), {
            id,
            email: email || '',
            name: name || '',
            password: password || '',
            updated_by: req.user.user_id,
        });

        if (!response.success) {
            return res.status(400).json(response);
        }

        res.json(response);
    } catch (error) {
        console.error('❌ Client update error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

router.delete('/:id', validateJWT(['user', 'superadmin']), async (req, res) => {
    try {
        const { id } = req.params;

        const response = await promisifyGRPC(userClient.DeleteClient.bind(userClient), {
            id,
            deleted_by: req.user.user_id,
        });

        if (!response.success) {
            return res.status(400).json(response);
        }

        res.json(response);
    } catch (error) {
        console.error('❌ Client delete error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

module.exports = router;