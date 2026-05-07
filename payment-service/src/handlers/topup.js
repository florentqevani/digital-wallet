// src/handlers/topup.js - Admin top-up: credits a client's balance

const pool = require('../db');
const { publishLog } = require('../rabbitmq/log-producer');

async function AdminTopUp(call, callback) {
    const { admin_id, actor_type = 'user', client_id, amount, currency = 'ALL', note = '' } = call.request;

    if (!client_id) {
        return callback(null, { success: false, message: 'client_id is required' });
    }
    if (!amount || amount <= 0) {
        return callback(null, { success: false, message: 'amount must be greater than zero' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock the client row
        const clientResult = await client.query(
            'SELECT id, balance, email FROM clients WHERE id = $1 FOR UPDATE',
            [client_id]
        );
        if (clientResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return callback(null, { success: false, message: 'Client not found' });
        }

        const clientEmail = clientResult.rows[0].email;

        // Credit balance
        const updated = await client.query(
            'UPDATE clients SET balance = balance + $1 WHERE id = $2 RETURNING balance',
            [amount, client_id]
        );

        // Record transaction (from_client_id is NULL for admin top-ups)
        const txResult = await client.query(
            `INSERT INTO transactions (from_client_id, to_client_id, amount, currency, type, status, note)
             VALUES (NULL, $1, $2, $3, 'TOPUP', 'COMPLETED', $4)
             RETURNING id`,
            [client_id, amount, currency, note || 'Admin top-up by System']
        );

        await client.query('COMMIT');

        const newBalance = parseFloat(updated.rows[0].balance);
        console.log(`✓ Admin top-up ${amount} ${currency} → client ${clientEmail} (balance: ${newBalance})`);

        publishLog({
            actor_id: 'System',
            actor_type: actor_type,
            action: 'TOPUP',
            status: 'SUCCESS',
            message: `Top-up of ${amount.toFixed(2)} ${currency} applied to ${clientEmail}. New balance: ${newBalance.toFixed(2)} ${currency}. Tx: ${txResult.rows[0].id}`,
        });

        callback(null, {
            success: true,
            transaction_id: txResult.rows[0].id,
            new_balance: newBalance,
            message: `Top-up of ${amount.toFixed(2)} ${currency} applied. New balance: ${newBalance.toFixed(2)}`,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ AdminTopUp error:', err.message);
        publishLog({
            actor_id: 'System',
            actor_type: actor_type,
            action: 'TOPUP',
            status: 'FAILURE',
            message: err.message,
        });
        callback(null, { success: false, message: err.message });
    } finally {
        client.release();
    }
}

module.exports = { AdminTopUp };
