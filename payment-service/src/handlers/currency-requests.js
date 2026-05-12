const pool = require("../db");
const { publishLog } = require("../rabbitmq/log-producer");
const { publishCurrencyApproved } = require("../rabbitmq/currency-producter");

const SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "GBP"]);

async function RequestCurrency(call, callback) {
  const { client_id, requested_currency } = call.request;
  const currency = String(requested_currency || "")
    .trim()
    .toUpperCase();

  if (!client_id) {
    return callback(null, {
      success: false,
      request_id: "",
      message: "client_id is required",
    });
  }

  if (!SUPPORTED_CURRENCIES.has(currency)) {
    return callback(null, {
      success: false,
      request_id: "",
      message: "requested_currency must be one of USD, EUR, GBP",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const clientRes = await client.query(
      "SELECT id, email FROM clients WHERE id = $1",
      [client_id],
    );
    if (clientRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return callback(null, {
        success: false,
        request_id: "",
        message: "Client not found",
      });
    }
    const clientEmail = clientRes.rows[0].email;

    // Prevent requesting a currency account that already exists.
    const accountRes = await client.query(
      "SELECT id FROM accounts WHERE client_id = $1 AND currency = $2 AND status = 'ACTIVE'",
      [client_id, currency],
    );
    if (accountRes.rows.length > 0) {
      await client.query("ROLLBACK");
      return callback(null, {
        success: false,
        request_id: "",
        message: `Active ${currency} account already exists`,
      });
    }

    // Avoid duplicate pending requests for the same currency.
    const pendingRes = await client.query(
      `SELECT id
       FROM currency_requests
       WHERE client_id = $1 AND requested_currency = $2 AND status = 'PENDING'`,
      [client_id, currency],
    );
    if (pendingRes.rows.length > 0) {
      await client.query("ROLLBACK");
      return callback(null, {
        success: false,
        request_id: "",
        message: "A pending request for this currency already exists",
      });
    }

    const insertRes = await client.query(
      `INSERT INTO currency_requests (client_id, requested_currency, status)
       VALUES ($1, $2, 'PENDING')
       RETURNING id`,
      [client_id, currency],
    );

    await client.query("COMMIT");

    const requestId = insertRes.rows[0].id;
    publishLog({
      actor_id: clientEmail || client_id,
      actor_type: "client",
      action: "REQUEST_CURRENCY",
      status: "SUCCESS",
      message: `Currency request created for ${currency}. Request ID: ${requestId}`,
    });

    return callback(null, {
      success: true,
      request_id: requestId,
      message: "Currency request created",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ RequestCurrency error:", err.message);
    publishLog({
      actor_id: client_id || "unknown",
      actor_type: "client",
      action: "REQUEST_CURRENCY",
      status: "FAILURE",
      message: err.message,
    });
    return callback(null, {
      success: false,
      request_id: "",
      message: err.message,
    });
  } finally {
    client.release();
  }
}

async function ListCurrencyRequests(call, callback) {
  const {
    status = "",
    client_id = "",
    currency = "",
    page = 1,
    limit = 50,
  } = call.request;

  try {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push(`cr.status = $${params.length + 1}`);
      params.push(String(status).trim().toUpperCase());
    }

    if (client_id) {
      conditions.push(`cr.client_id = $${params.length + 1}`);
      params.push(client_id);
    }

    if (currency) {
      conditions.push(`cr.requested_currency = $${params.length + 1}`);
      params.push(String(currency).trim().toUpperCase());
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";
    const safeLimit = Math.min(Math.max(Number.parseInt(limit) || 50, 1), 200);
    const safePage = Math.max(Number.parseInt(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const countRes = await pool.query(
      `SELECT COUNT(*) AS count
       FROM currency_requests cr
       ${whereClause}`,
      params,
    );

    const dataParams = [...params, safeLimit, offset];
    const dataRes = await pool.query(
      `SELECT
          cr.id,
          cr.client_id,
          cr.requested_currency AS currency,
          cr.status,
          COALESCE(u.email, '') AS reviewed_by,
          (EXTRACT(EPOCH FROM cr.created_at) * 1000)::BIGINT AS created_at,
          COALESCE((EXTRACT(EPOCH FROM cr.reviewed_at) * 1000)::BIGINT, 0) AS reviewed_at,
          COALESCE(cr.reason, '') AS reason
       FROM currency_requests cr
       LEFT JOIN users u ON u.id = cr.reviewed_by
       ${whereClause}
       ORDER BY cr.created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );

    const requests = dataRes.rows.map((row) => ({
      id: row.id,
      client_id: row.client_id,
      currency: row.currency,
      status: row.status,
      reviewed_by: row.reviewed_by,
      created_at: Number(row.created_at),
      reviewed_at: Number(row.reviewed_at),
      reason: row.reason,
    }));

    return callback(null, {
      requests,
      total: Number.parseInt(countRes.rows[0].count, 10),
    });
  } catch (err) {
    console.error("❌ ListCurrencyRequests error:", err.message);
    return callback(null, {
      requests: [],
      total: 0,
      message: err.message,
    });
  }
}

async function ReviewCurrencyRequest(call, callback) {
  const {
    request_id,
    approve = false,
    reason = "",
    reviewed_by = "",
  } = call.request;

  if (!request_id) {
    return callback(null, {
      success: false,
      message: "request_id is required",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const reqRes = await client.query(
      `SELECT cr.id, cr.client_id, cr.requested_currency, c.email
       FROM currency_requests cr
       JOIN clients c ON c.id = cr.client_id
       WHERE cr.id = $1 AND cr.status = 'PENDING'
       FOR UPDATE`,
      [request_id],
    );

    if (reqRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return callback(null, {
        success: false,
        message: "Currency request not found or already reviewed",
      });
    }

    const requestRow = reqRes.rows[0];
    const newStatus = approve ? "ACCEPTED" : "REJECTED";

    await client.query(
      `UPDATE currency_requests
       SET status = $1,
           reviewed_by = NULLIF($2, '')::uuid,
           reviewed_at = NOW(),
           reason = $3
       WHERE id = $4`,
      [newStatus, reviewed_by, reason || "", request_id],
    );

    await client.query("COMMIT");

    if (approve) {
      publishCurrencyApproved({
        request_id,
        client_id: requestRow.client_id,
        currency: requestRow.requested_currency,
      });
    }

    publishLog({
      actor_id: requestRow.email || requestRow.client_id,
      actor_type: "client",
      action: "REVIEW_CURRENCY_REQUEST",
      status: "SUCCESS",
      message: `Currency request ${request_id} ${newStatus.toLowerCase()} (${requestRow.requested_currency})`,
    });

    return callback(null, {
      success: true,
      message: `Currency request ${newStatus.toLowerCase()}`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ ReviewCurrencyRequest error:", err.message);
    return callback(null, {
      success: false,
      message: err.message,
    });
  } finally {
    client.release();
  }
}

module.exports = {
  RequestCurrency,
  ListCurrencyRequests,
  ReviewCurrencyRequest,
};
