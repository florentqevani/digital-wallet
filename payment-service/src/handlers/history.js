

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
                        t.id,
                        COALESCE(t.from_client_id::text, '') AS from_client_id,
                        t.to_client_id,
                        COALESCE(fc.email, '')               AS from_email,
                        COALESCE(tc.email, '')               AS to_email,
                        t.amount,
                        t.currency,
                        t.type,
                        t.status,
                        COALESCE(t.note, '') AS note,
                        EXTRACT(EPOCH FROM t.created_at)::bigint * 1000 AS created_at
                     FROM transactions t
                     LEFT JOIN clients fc ON fc.id = t.from_client_id
                     LEFT JOIN clients tc ON tc.id = t.to_client_id
                     ORDER BY t.created_at DESC
                     LIMIT $1 OFFSET $2`,
                    [safeLimit, safeOffset]
                  )
                : pool.query(
                    `SELECT
                        t.id,
                        COALESCE(t.from_client_id::text, '') AS from_client_id,
                        t.to_client_id,
                        COALESCE(fc.email, '')               AS from_email,
                        COALESCE(tc.email, '')               AS to_email,
                        t.amount,
                        t.currency,
                        t.type,
                        t.status,
                        COALESCE(t.note, '') AS note,
                        EXTRACT(EPOCH FROM t.created_at)::bigint * 1000 AS created_at
                     FROM transactions t
                     LEFT JOIN clients fc ON fc.id = t.from_client_id
                     LEFT JOIN clients tc ON tc.id = t.to_client_id
                     WHERE t.from_client_id = $1 OR t.to_client_id = $1
                     ORDER BY t.created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [client_id, safeLimit, safeOffset]
                  ),
        ]);

        const transactions = rowsResult.rows.map(row => ({
            id:             row.id,
            from_client_id: row.from_client_id,
            to_client_id:   row.to_client_id,
            from_email:     row.from_email,
            to_email:       row.to_email,
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
