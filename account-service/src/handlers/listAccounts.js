const { pool } = require('../db');
async function ListAccounts(call, callback) {
    try {
        const result = await pool.query('SELECT account_id FROM clients');
        callback(null, { accounts: result.rows });
        if (result.rows.length > 0) {
            console.log('✅ Accounts listed successfully');
        } else {
            console.log('⚠️ No accounts found');
        }
    } catch (error) {
        console.error('❌ Error listing accounts:', error.message);
        callback(error);
    }
}

module.exports = {
    ListAccounts,
};