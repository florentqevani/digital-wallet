// src/handlers/token.js - Token creation handler

const jwt = require('jsonwebtoken');
const config = require('../config');
const { permissionsForRole } = require('../permissions');

function CreateToken(call, callback) {
    const { user_id, role } = call.request;

    if (!user_id || !role) {
        return callback(null, {
            token: '',
            success: false,
            message: 'user_id and role are required',
        });
    }

    try {
        const token = jwt.sign(
            { id: user_id, role, permissions: permissionsForRole(role) },
            config.jwtSecret,
            { expiresIn: config.jwtExpiry }
        );

        console.log(`✓ Token created for user: ${user_id} (role: ${role})`);

        callback(null, {
            token,
            success: true,
            message: 'Token created successfully',
        });
    } catch (error) {
        console.error('❌ Token creation error:', error.message);
        callback(null, {
            token: '',
            success: false,
            message: error.message,
        });
    }
}

module.exports = { CreateToken };
