const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
    connectionString: config.authDbUrl,
});

pool.on('connect', () => {
    console.log('✓ Database connected');
});

pool.on('error', (err) => {
    console.error('✗ Unexpected error on idle client', err);
});

module.exports = pool;
