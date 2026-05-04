const express = require('express');
const { userClient } = require('../grpc-clients');
const { validateJWT } = require('../middleware/jwt-validator');
const { promisifyGRPC } = require('../utils/promise-wrapper');

const router = express.Router();

router.post('/', validateJWT(['user', 'superadmin']), async (req, res) => {
    try {
        const { client_id, currency } = req.body;

        if (!client_id || !currency) {
            return res.status(400).json({ success: false, message: 'client_id and currency are required' });
        }

        const response = await promisifyGRPC(userClient.SetCurrency.bind(userClient), {
            client_id,
            currency: currency.toUpperCase(),
        });

        if (!response.success) {
            return res.status(400).json(response);
        }

        res.json(response);
    } catch (error) {
        console.error('❌ Set currency error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
