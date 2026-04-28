// src/config.js - Configuration loader

require('dotenv').config();

const config = {
    // Server
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Services
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'localhost:50051',
    logServiceUrl: process.env.LOG_SERVICE_URL || 'localhost:50054',
    apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://api-gateway:8080',

    // Auth
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
};

console.log('📋 Config loaded:', {
    port: config.port,
    authServiceUrl: config.authServiceUrl,
    logServiceUrl: config.logServiceUrl,
    apiGatewayUrl: config.apiGatewayUrl,
});

module.exports = config;