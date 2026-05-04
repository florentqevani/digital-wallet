const { pool } = require('../db');
const { randomUUID } = require('crypto');

async function addAccountId(clientId) {
    const account_id = randomUUID();
    const result = await pool.query(
        'UPDATE clients SET account_id = $1 WHERE id = $2 RETURNING id, account_id',
        [account_id, clientId]
    );
    if (result.rowCount === 0) {
        throw new Error(`Client ${clientId} not found`);
    }
    console.log(`✅ Account ID ${account_id} assigned to client ${clientId}`);
    return result.rows[0];
}

async function addCurrency(call, callback) {
    try {
        const { client_id, currency } = call.request;
        if (!client_id || !currency) {
            return callback(null, { success: false, message: 'client_id and currency are required' });
        }
        const result = await pool.query('UPDATE clients SET currency = $1 WHERE id = $2 RETURNING id', [currency, client_id]);
        if (result.rowCount === 0) {
            return callback(null, { success: false, message: 'Client not found' });
        }

        callback(null, { success: true, message: 'Currency added successfully' });
    } catch (error) {
        console.error('❌ Error adding currency:', error.message);
        callback(null, { success: false, message: 'Failed to add currency' });
    }
}


module.exports = { addAccountId, addCurrency };
