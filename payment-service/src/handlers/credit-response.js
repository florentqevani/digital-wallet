const pool = require("../db");
const { publishLog } = require("../rabbitmq/log-producer");

async function RespondCreditRequest(call, callback) {
  const { request_id, payer_id, accept } = call.request;

  if (!request_id)
    return callback(null, {
      success: false,
      transaction_id: "",
      message: "request_id is required",
    });
  if (!payer_id)
    return callback(null, {
      success: false,
      transaction_id: "",
      message: "payer_id is required",
    });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the credit request
    const reqResult = await client.query(
      `SELECT id, requester_id, payer_id, amount, currency
       FROM credit_requests WHERE id = $1 AND status = 'PENDING' FOR UPDATE`,
      [request_id],
    );
    if (reqResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return callback(null, {
        success: false,
        transaction_id: "",
        message: "Credit request not found or not pending",
      });
    }
    const req = reqResult.rows[0];
    if (req.payer_id !== payer_id) {
      await client.query("ROLLBACK");
      return callback(null, {
        success: false,
        transaction_id: "",
        message: "Unauthorized: you are not the payer for this request",
      });
    }

    let transactionId = "";

    if (accept) {
      // Lock payer and check balance
      const payerResult = await client.query(
        "SELECT balance, email FROM clients WHERE id = $1 FOR UPDATE",
        [payer_id],
      );
      const payerBalance = parseFloat(payerResult.rows[0].balance);
      const payerEmail = payerResult.rows[0].email;

      if (payerBalance < parseFloat(req.amount)) {
        await client.query("ROLLBACK");
        return callback(null, {
          success: false,
          transaction_id: "",
          message: "Insufficient balance",
        });
      }

      // Lock requester
      const requesterResult = await client.query(
        "SELECT email FROM clients WHERE id = $1 FOR UPDATE",
        [req.requester_id],
      );
      const requesterEmail = requesterResult.rows[0].email;

      // Atomic debit payer / credit requester
      await client.query(
        "UPDATE clients SET balance = balance - $1 WHERE id = $2",
        [req.amount, payer_id],
      );
      await client.query(
        "UPDATE clients SET balance = balance + $1 WHERE id = $2",
        [req.amount, req.requester_id],
      );

      // Record as TRANSFER (satisfies CHECK constraint)
      const txResult = await client.query(
        `INSERT INTO transactions (from_client_id, to_client_id, amount, currency, type, status, note)
         VALUES ($1, $2, $3, $4, 'TRANSFER', 'COMPLETED', 'Credit request accepted') RETURNING id`,
        [payer_id, req.requester_id, req.amount, req.currency],
      );
      transactionId = txResult.rows[0].id;

      console.log(
        `✓ Credit request ${request_id} accepted: ${payerEmail} → ${requesterEmail} ${req.amount} ${req.currency}`,
      );
      publishLog({
        actor_id: payerEmail,
        actor_type: "user",
        action: "RESPOND_CREDIT_REQUEST",
        status: "SUCCESS",
        message: `Credit request accepted. ${parseFloat(req.amount).toFixed(2)} ${req.currency} sent to ${requesterEmail}.`,
      });
    } else {
      const payerEmailResult = await client.query(
        "SELECT email FROM clients WHERE id = $1",
        [payer_id],
      );
      const payerEmail = payerEmailResult.rows[0]?.email || payer_id;
      console.log(`✓ Credit request ${request_id} rejected by ${payerEmail}`);
      publishLog({
        actor_id: payerEmail,
        actor_type: "user",
        action: "RESPOND_CREDIT_REQUEST",
        status: "SUCCESS",
        message: `Credit request ${request_id} rejected.`,
      });
    }

    const newStatus = accept ? "ACCEPTED" : "REJECTED";
    await client.query(
      "UPDATE credit_requests SET status = $1, updated_at = NOW() WHERE id = $2",
      [newStatus, request_id],
    );
    await client.query("COMMIT");

    callback(null, {
      success: true,
      transaction_id: transactionId,
      message: `Credit request ${newStatus.toLowerCase()} successfully`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ RespondCreditRequest error:", err.message);
    publishLog({
      actor_id: payer_id,
      actor_type: "user",
      action: "RESPOND_CREDIT_REQUEST",
      status: "FAILURE",
      message: err.message,
    });
    callback(null, {
      success: false,
      transaction_id: "",
      message: err.message,
    });
  } finally {
    client.release();
  }
}

module.exports = { RespondCreditRequest };
