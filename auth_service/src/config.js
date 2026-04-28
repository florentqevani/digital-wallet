// src/config.js - Configuration loader
// This file reads environment variables and validates them

require('dotenv').config();

const config = {
    // Server
    port: process.env.PORT || 50054,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    authDbUrl: process.env.AUTH_DB_URL,

    // JWT
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '7d',

    // Log Service
    logServiceUrl: process.env.LOG_SERVICE_URL || 'localhost:50052',
};

// Validate required environment variables
// if (!config.authDbUrl) {
//     throw new Error('AUTH_DB_URL environment variable is required');
// }

// if (!config.jwtSecret) {
//     throw new Error('JWT_SECRET environment variable is required');
// }

module.exports = config;