// src/handlers/validate.js - Validate JWT tokens

const jwt = require('jsonwebtoken');
const config = require('../config');

function ValidateToken(call, callback) {
    const { token } = call.request;

    try {
        // Verify and decode the token
        const decoded = jwt.verify(token, config.jwtSecret);

        console.log(`✓ Token validated for user: ${decoded.id}`);

        callback(null, {
            user_id: decoded.id,
            role: decoded.role,
            permissions: decoded.permissions || [],
            valid: true,
        });
    } catch (error) {
        console.log(`⚠ Token validation failed: ${error.message}`);

        callback(null, {
            user_id: '',
            role: '',
            valid: false,
        });
    }
}

module.exports = { ValidateToken };