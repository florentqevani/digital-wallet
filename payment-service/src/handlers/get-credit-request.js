const pool = require("../db");

async function GetCreditRequests(call, callback) {
  const {
    client_id,
    direction = "",
    status_filter = "PENDING",
    limit = 50,
    offset = 0,
  } = call.request;

  if (!client_id)
    return callback(null, {
      success: false,
      requests: [],
      total: 0,
      message: "client_id is required",
    });

  let whereCondition;
  if (direction === "received") {
    whereCondition = "cr.payer_id = $1";
  } else if (direction === "sent") {
    whereCondition = "cr.requester_id = $1";
  } else {
    whereCondition = "(cr.payer_id = $1 OR cr.requester_id = $1)";
  }

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM credit_requests cr WHERE ${whereCondition} AND cr.status = $2`,
      [client_id, status_filter],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT cr.id, cr.requester_id, cr.payer_id,
              r.email AS requester_email,
              p.email AS payer_email,
              cr.amount, cr.currency, cr.note, cr.status,
              (EXTRACT(EPOCH FROM cr.created_at) * 1000)::BIGINT AS created_at
       FROM credit_requests cr
       JOIN clients r ON r.id = cr.requester_id
       JOIN clients p ON p.id = cr.payer_id
       WHERE ${whereCondition} AND cr.status = $2
       ORDER BY cr.created_at DESC
       LIMIT $3 OFFSET $4`,
      [client_id, status_filter, limit, offset],
    );

    const requests = dataResult.rows.map((row) => ({
      id: row.id,
      requester_id: row.requester_id,
      payer_id: row.payer_id,
      requester_email: row.requester_email,
      payer_email: row.payer_email,
      amount: parseFloat(row.amount),
      currency: row.currency,
      note: row.note || "",
      status: row.status,
      created_at: Number(row.created_at),
    }));

    callback(null, { success: true, requests, total, message: "" });
  } catch (err) {
    console.error("❌ GetCreditRequests error:", err.message);
    callback(null, {
      success: false,
      requests: [],
      total: 0,
      message: err.message,
    });
  }
}

module.exports = { GetCreditRequests };
