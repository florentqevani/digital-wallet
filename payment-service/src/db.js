// src/db.js - PostgreSQL connection pool for payment service

const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({ connectionString: config.authDbUrl });

pool.on('connect', () => console.log('✓ Payment DB connected'));
pool.on('error',   (err) => console.error('✗ Idle DB client error', err));

module.exports = pool;
