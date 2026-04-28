require('dotenv').config();

const config = {
    port: process.env.PORT || 3002,
    nodeEnv: process.env.NODE_ENV || 'development',
    authServiceUrl: process.env.AUTH_SERVICE_URL,
    logServiceUrl: process.env.LOG_SERVICE_URL,
    apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://api-gateway:8080'
};

module.exports = config;
