

const pool = require('../db');
const { publishLog } = require('../rabbitmq/log-producer');

async function TransferFunds(call, callback) {
    const { from_client_id, to_client_id, amount, currency = 'ALL', note = '' } = call.request;

    if (!from_client_id || !to_client_id) {
        return callback(null, { success: false, message: 'from_client_id and to_client_id are required' });
    }
    if (!amount || amount <= 0) {
        return callback(null, { success: false, message: 'amount must be greater than zero' });
    }
    if (from_client_id === to_client_id) {
        return callback(null, { success: false, message: 'Cannot transfer to yourself' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock the sender row first to prevent race conditions
        const senderResult = await client.query(
            'SELECT id, balance, email FROM clients WHERE id = $1 FOR UPDATE',
            [from_client_id]
        );
        if (senderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return callback(null, { success: false, message: 'Sender not found' });
        }

        const senderBalance = parseFloat(senderResult.rows[0].balance);
        const senderEmail = senderResult.rows[0].email;
        if (senderBalance < amount) {
            await client.query('ROLLBACK');
            return callback(null, {
                success: false,
                message: `Insufficient balance. Available: ${senderBalance.toFixed(2)} ${currency}`,
            });
        }

        // Lock recipient row
        const recipientResult = await client.query(
            'SELECT id, email FROM clients WHERE id = $1 FOR UPDATE',
            [to_client_id]
        );
        if (recipientResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return callback(null, { success: false, message: 'Recipient not found' });
        }

        const recipientEmail = recipientResult.rows[0].email;

        // Atomic debit / credit
        await client.query('UPDATE clients SET balance = balance - $1 WHERE id = $2', [amount, from_client_id]);
        await client.query('UPDATE clients SET balance = balance + $1 WHERE id = $2', [amount, to_client_id]);

        // Record the transaction
        const txResult = await client.query(
            `INSERT INTO transactions (from_client_id, to_client_id, amount, currency, type, status, note)
             VALUES ($1, $2, $3, $4, 'TRANSFER', 'COMPLETED', $5)
             RETURNING id`,
            [from_client_id, to_client_id, amount, currency, note]
        );

        await client.query('COMMIT');

        console.log(`✓ Transfer ${amount} ${currency}: ${senderEmail} → ${recipientEmail}`);

        publishLog({
            actor_id:   senderEmail,
            actor_type: 'client',
            action:     'PAYMENT_COMPLETED',
            status:     'SUCCESS',
            message:    `Transfer of ${amount.toFixed(2)} ${currency} to ${recipientEmail}. Tx: ${txResult.rows[0].id}`,
        });

        callback(null, {
            success: true,
            transaction_id: txResult.rows[0].id,
            message: `Transfer of ${amount.toFixed(2)} ${currency} completed`,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ TransferFunds error:', err.message);
        publishLog({
            actor_id:   from_client_id,
            actor_type: 'client',
            action:     'PAYMENT_COMPLETED',
            status:     'FAILURE',
            message:    err.message,
        });
        callback(null, { success: false, message: err.message });
    } finally {
        client.release();
    }
}

module.exports = { TransferFunds };
