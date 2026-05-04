require('dotenv').config();

module.exports = {
    port: process.env.PORT || 50055,
    nodeEnv: process.env.NODE_ENV || 'development',
    dbUrl: process.env.AUTH_DB_URL,
    logServiceUrl: process.env.LOG_SERVICE_URL
};