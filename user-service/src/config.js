require('dotenv').config();

const config = {
    port: process.env.PORT || 50053,
    nodeEnv: process.env.NODE_ENV || 'development',
    healthPort: process.env.HEALTH_PORT || 15053,
    authDbUrl: process.env.AUTH_DB_URL,
    logServiceUrl: process.env.LOG_SERVICE_URL || 'localhost:50052',
};

if (!config.authDbUrl) {
    throw new Error('AUTH_DB_URL is not defined in environment variables');
}

module.exports = config;
