require('dotenv').config();

module.exports = {
    port:       Number(process.env.PORT)        || 50055,
    healthPort: Number(process.env.HEALTH_PORT) || 15055,
    nodeEnv:    process.env.NODE_ENV            || 'development',
    authDbUrl:  process.env.AUTH_DB_URL         || 'postgres://app:secret@localhost:5432/auth_db',
};