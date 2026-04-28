// src/handlers/write-log.js - Write a log entry

const pool = require('../db');

async function WriteLog(call, callback) {
    const { actor_id, actor_type, action, status, message, timestamp } = call.request;

    try {
        // Validate input
        if (!actor_id || !actor_type || !action || !status) {
            const error = 'actor_id, actor_type, action, and status are required';
            console.error('❌ WriteLog validation error:', error);
            return callback(null, { saved: false });
        }

        // Insert log entry
        const result = await pool.query(
            `INSERT INTO logs 
       (actor_id, actor_type, action, status, message, created_at) 
       VALUES ($1, $2, $3, $4, $5, to_timestamp($6/1000.0))
       RETURNING id`,
            [actor_id, actor_type, action, status, message || '', timestamp || Date.now()]
        );

        const logId = result.rows[0].id;
        console.log(`✓ Log written: ${logId} | ${actor_type}/${action}/${status}`);

        callback(null, { saved: true });
    } catch (error) {
        console.error('❌ WriteLog error:', error.message);
        callback(null, { saved: false });
    }
}

module.exports = { WriteLog };