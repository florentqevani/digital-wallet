

const pool = require('../db');

async function GetTransactionHistory(call, callback) {
    const { client_id, limit = 50, offset = 0 } = call.request;

    const safeLimit  = Math.min(Math.max(1, limit),  200);
    const safeOffset = Math.max(0, offset);

    const isAll = !client_id;

    try {
        const [countResult, rowsResult] = await Promise.all([
            isAll
                ? pool.query('SELECT COUNT(*) FROM transactions')
                : pool.query(
                    'SELECT COUNT(*) FROM transactions WHERE from_client_id = $1 OR to_client_id = $1',
                    [client_id]
                  ),
            isAll
                ? pool.query(
                    `SELECT
                        id,
                        COALESCE(from_client_id::text, '') AS from_client_id,
                        to_client_id,
                        amount,
                        currency,
                        type,
                        status,
                        COALESCE(note, '') AS note,
                        EXTRACT(EPOCH FROM created_at)::bigint * 1000 AS created_at
                     FROM transactions
                     ORDER BY created_at DESC
                     LIMIT $1 OFFSET $2`,
                    [safeLimit, safeOffset]
                  )
                : pool.query(
                    `SELECT
                        id,
                        COALESCE(from_client_id::text, '') AS from_client_id,
                        to_client_id,
                        amount,
                        currency,
                        type,
                        status,
                        COALESCE(note, '') AS note,
                        EXTRACT(EPOCH FROM created_at)::bigint * 1000 AS created_at
                     FROM transactions
                     WHERE from_client_id = $1 OR to_client_id = $1
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [client_id, safeLimit, safeOffset]
                  ),
        ]);

        const transactions = rowsResult.rows.map(row => ({
            id:             row.id,
            from_client_id: row.from_client_id,
            to_client_id:   row.to_client_id,
            amount:         parseFloat(row.amount),
            currency:       row.currency,
            type:           row.type,
            status:         row.status,
            note:           row.note,
            created_at:     Number(row.created_at),
        }));

        callback(null, {
            success: true,
            transactions,
            total: parseInt(countResult.rows[0].count, 10),
            message: 'OK',
        });
    } catch (err) {
        console.error('❌ GetTransactionHistory error:', err.message);
        callback(null, { success: false, transactions: [], total: 0, message: err.message });
    }
}

module.exports = { GetTransactionHistory };
