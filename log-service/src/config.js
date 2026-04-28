require('dotenv').config();

const config = {
    port: process.env.PORT || 50052,
    nodeEnv: process.env.NODE_ENV || 'development',
    logDbUrl: process.env.LOG_DB_URL
};
if (!config.logDbUrl) {
    throw new Error('LOG_DB_URL is not defined in environment variables');
}

module.exports = config;
