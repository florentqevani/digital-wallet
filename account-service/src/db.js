const pg = require('pg');
const { dbUrl } = require('./config');

const pool = new pg.Pool({
    connectionString: dbUrl,
});
pool.on('connect', () => {
    console.log('✅ Connected to the database');
});
pool.on('error', (err) => {
    console.error('❌ Database error:', err);
});

module.exports = {
    pool,
};