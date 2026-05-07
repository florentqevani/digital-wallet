const pool = require("../db");
const { publishLog } = require("../rabbitmq/log-producer");

async function CreateCreditRequest(call, callback) {
  const {
    requester_id,
    payer_email,
    amount,
    currency = "ALL",
    note = "",
  } = call.request;

  if (!requester_id)
    return callback(null, {
      success: false,
      request_id: "",
      message: "requester_id is required",
    });
  if (!payer_email)
    return callback(null, {
      success: false,
      request_id: "",
      message: "payer_email is required",
    });
  if (!amount || amount <= 0)
    return callback(null, {
      success: false,
      request_id: "",
      message: "amount must be greater than zero",
    });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Look up payer by email
    const payerResult = await client.query(
      "SELECT id FROM clients WHERE email = $1",
      [payer_email.trim().toLowerCase()],
    );
    if (payerResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return callback(null, {
        success: false,
        request_id: "",
        message: "Payer not found",
      });
    }
    const payer_id = payerResult.rows[0].id;

    // Look up requester email for logging
    const requesterResult = await client.query(
      "SELECT email FROM clients WHERE id = $1",
      [requester_id],
    );
    if (requesterResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return callback(null, {
        success: false,
        request_id: "",
        message: "Requester not found",
      });
    }
    const requesterEmail = requesterResult.rows[0].email;

    if (requester_id === payer_id) {
      await client.query("ROLLBACK");
      return callback(null, {
        success: false,
        request_id: "",
        message: "Cannot request credit from yourself",
      });
    }

    const insertResult = await client.query(
      `INSERT INTO credit_requests (requester_id, payer_id, amount, currency, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [requester_id, payer_id, amount, currency, note],
    );
    await client.query("COMMIT");

    const requestId = insertResult.rows[0].id;
    console.log(
      `✓ Credit request ${requestId}: ${requesterEmail} requests ${amount} ${currency} from ${payer_email}`,
    );
    publishLog({
      actor_id: requesterEmail,
      actor_type: "user",
      action: "CREATE_CREDIT_REQUEST",
      status: "SUCCESS",
      message: `Credit request of ${amount.toFixed(2)} ${currency} sent to ${payer_email}. Request ID: ${requestId}`,
    });
    callback(null, {
      success: true,
      request_id: requestId,
      message: "Credit request created successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ CreateCreditRequest error:", err.message);
    publishLog({
      actor_id: requester_id,
      actor_type: "user",
      action: "CREATE_CREDIT_REQUEST",
      status: "FAILURE",
      message: err.message,
    });
    callback(null, { success: false, request_id: "", message: err.message });
  } finally {
    client.release();
  }
}

module.exports = { CreateCreditRequest };
