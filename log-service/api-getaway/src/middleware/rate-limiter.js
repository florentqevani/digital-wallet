// src/middleware/rate-limiter.js - Rate limiting middleware

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiter for auth endpoints
 * Stricter limits for login/register to prevent brute force
 */
const authLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: 10, // 10 requests per window for auth endpoints
    message: 'Too many auth attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for general API endpoints
 */
const apiLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };