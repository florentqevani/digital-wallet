

const pool = require('../db');

async function GetBalance(call, callback) {
    const { client_id } = call.request;

    if (!client_id) {
        return callback(null, { success: false, balance: 0, message: 'client_id is required' });
    }

    try {
        const result = await pool.query(
            'SELECT balance, currency FROM clients WHERE id = $1',
            [client_id]
        );

        if (result.rows.length === 0) {
            return callback(null, { success: false, balance: 0, message: 'Client not found' });
        }

        const row = result.rows[0];
        callback(null, {
            success: true,
            balance: parseFloat(row.balance),
            currency: row.currency || 'ALL',
            message: 'OK',
        });
    } catch (err) {
        console.error('❌ GetBalance error:', err.message);
        callback(null, { success: false, balance: 0, message: err.message });
    }
}

module.exports = { GetBalance };
