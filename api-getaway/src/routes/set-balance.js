const express = require('express');
const { userClient } = require('../grpc-clients');
const { validateJWT } = require('../middleware/jwt-validator');
const { promisifyGRPC } = require('../utils/promise-wrapper');

const router = express.Router();

router.post('/', validateJWT(['user', 'superadmin']), async (req, res) => {
    try {
        const { client_id, balance } = req.body;

        if (!client_id) {
            return res.status(400).json({ success: false, message: 'client_id is required' });
        }

        const amount = parseFloat(balance);
        if (isNaN(amount) || amount < 0) {
            return res.status(400).json({ success: false, message: 'balance must be a non-negative number' });
        }

        const response = await promisifyGRPC(userClient.SetBalance.bind(userClient), {
            client_id,
            balance: amount,
        });

        if (!response.success) {
            return res.status(400).json(response);
        }

        res.json(response);
    } catch (error) {
        console.error('❌ Set balance error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
