const express = require('express');
const { userClient } = require('../grpc-clients');
const { validateJWT } = require('../middleware/jwt-validator');
const { promisifyGRPC } = require('../utils/promise-wrapper');

const router = express.Router();

router.get('/', validateJWT(['superadmin']), async (req, res) => {
    try {
        const response = await promisifyGRPC(userClient.ListUsers.bind(userClient), {});
        res.json(response);
    } catch (error) {
        console.error('❌ User list error:', error.message);
        res.status(500).json({
            users: [],
            message: error.message,
        });
    }
});

router.put('/:id', validateJWT(['superadmin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name, role, password } = req.body;

        const response = await promisifyGRPC(userClient.UpdateUser.bind(userClient), {
            id,
            email: email || '',
            name: name || '',
            role: role || '',
            password: password || '',
            updated_by: req.user.user_id,
        });

        if (!response.success) {
            return res.status(400).json(response);
        }

        res.json(response);
    } catch (error) {
        console.error('❌ User update error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

router.delete('/:id', validateJWT(['superadmin']), async (req, res) => {
    try {
        const { id } = req.params;

        const response = await promisifyGRPC(userClient.DeleteUser.bind(userClient), {
            id,
            deleted_by: req.user.user_id,
        });

        if (!response.success) {
            return res.status(400).json(response);
        }

        res.json(response);
    } catch (error) {
        console.error('❌ User delete error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

module.exports = router;
