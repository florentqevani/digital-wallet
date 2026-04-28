// src/middleware/jwt-validator.js - JWT validation middleware

const jwt = require('jsonwebtoken');
const config = require('../config');

function validateJWT(allowedRoles = []) {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No authorization header',
            });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid authorization header format',
            });
        }

        const token = parts[1];

        try {
            const decoded = jwt.verify(token, config.jwtSecret);

            if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `This endpoint requires one of these roles: ${allowedRoles.join(', ')}`,
                });
            }

            req.user = {
                user_id: decoded.id,
                role: decoded.role,
                permissions: decoded.permissions || [],
            };

            next();
        } catch (error) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token',
            });
        }
    };
}

module.exports = { validateJWT };