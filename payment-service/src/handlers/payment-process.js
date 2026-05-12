const pool = require("../db");
const { publishLog } = require("../rabbitmq/log-producer");

async function TransferFunds(call, callback) {
  const {
    from_client_id,
    to_client_id,
    amount,
    currency = "ALL",
    note = "",
  } = call.request;
  const currencyCode = String(currency).trim().toUpperCase() || "ALL";

  if (!from_client_id || !to_client_id) {
    return callback(null, {
      success: false,
      message: "from_client_id and to_client_id are required",
    });
  }
  if (!amount || amount <= 0) {
    return callback(null, {
      success: false,
      message: "amount must be greater than zero",
    });
  }
  if (from_client_id === to_client_id) {
    return callback(null, {
      success: false,
      message: "Cannot transfer to yourself",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get sender email
    const senderClientResult = await client.query(
      "SELECT id, email FROM clients WHERE id = $1",
      [from_client_id],
    );
    if (senderClientResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return callback(null, { success: false, message: "Sender not found" });
    }
    const senderEmail = senderClientResult.rows[0].email;

    // Get recipient email
    const recipientClientResult = await client.query(
      "SELECT id, email FROM clients WHERE id = $1",
      [to_client_id],
    );
    if (recipientClientResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return callback(null, { success: false, message: "Recipient not found" });
    }
    const recipientEmail = recipientClientResult.rows[0].email;

    let newSenderBalance;

    if (currencyCode === "ALL") {
      // Legacy flow: use clients.balance for ALL currency
      const senderBalResult = await client.query(
        "SELECT balance FROM clients WHERE id = $1 FOR UPDATE",
        [from_client_id],
      );
      const senderBalance = parseFloat(senderBalResult.rows[0].balance);
      if (senderBalance < amount) {
        await client.query("ROLLBACK");
        return callback(null, {
          success: false,
          message: `Insufficient balance. Available: ${senderBalance.toFixed(2)} ALL`,
        });
      }
      await client.query(
        "UPDATE clients SET balance = balance - $1 WHERE id = $2",
        [amount, from_client_id],
      );
      await client.query(
        "UPDATE clients SET balance = balance + $1 WHERE id = $2",
        [amount, to_client_id],
      );
      newSenderBalance = senderBalance - amount;

      // Sync accounts table for ALL currency
      await client.query(
        `UPDATE accounts SET balance = balance - $1, updated_at = NOW()
                 WHERE client_id = $2 AND currency = 'ALL'`,
        [amount, from_client_id],
      );
      await client.query(
        `INSERT INTO accounts (client_id, currency, balance, status, created_at, updated_at)
                 VALUES ($1, 'ALL', $2, 'ACTIVE', NOW(), NOW())
                 ON CONFLICT (client_id, currency) DO UPDATE SET balance = accounts.balance + $2, updated_at = NOW()`,
        [to_client_id, amount],
      );
    } else {
      // Multi-currency flow: use accounts table
      const senderAccResult = await client.query(
        `SELECT id, balance FROM accounts WHERE client_id = $1 AND currency = $2 AND status = 'ACTIVE' FOR UPDATE`,
        [from_client_id, currencyCode],
      );
      if (senderAccResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return callback(null, {
          success: false,
          message: `You don't have an active ${currencyCode} account`,
        });
      }
      const senderBalance = parseFloat(senderAccResult.rows[0].balance);
      if (senderBalance < amount) {
        await client.query("ROLLBACK");
        return callback(null, {
          success: false,
          message: `Insufficient ${currencyCode} balance. Available: ${senderBalance.toFixed(2)} ${currencyCode}`,
        });
      }

      // Debit sender
      await client.query(
        `UPDATE accounts SET balance = balance - $1, updated_at = NOW()
                 WHERE client_id = $2 AND currency = $3`,
        [amount, from_client_id, currencyCode],
      );
      newSenderBalance = senderBalance - amount;

      // Credit receiver – auto-create account if they don't have one for this currency
      await client.query(
        `INSERT INTO accounts (client_id, currency, balance, status, created_at, updated_at)
                 VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
                 ON CONFLICT (client_id, currency) DO UPDATE SET balance = accounts.balance + $3, updated_at = NOW()`,
        [to_client_id, currencyCode, amount],
      );
    }

    // Record the transaction
    const txResult = await client.query(
      `INSERT INTO transactions (from_client_id, to_client_id, amount, currency, type, status, note)
             VALUES ($1, $2, $3, $4, 'TRANSFER', 'COMPLETED', $5)
             RETURNING id`,
      [from_client_id, to_client_id, amount, currencyCode, note],
    );

    await client.query("COMMIT");

    console.log(
      `✓ Transfer ${amount} ${currencyCode}: ${senderEmail} → ${recipientEmail}`,
    );

    publishLog({
      actor_id: senderEmail,
      actor_type: "client",
      action: "PAYMENT_COMPLETED",
      status: "SUCCESS",
      message: `Transfer of ${amount.toFixed(2)} ${currencyCode} to ${recipientEmail}. Tx: ${txResult.rows[0].id}`,
    });

    callback(null, {
      success: true,
      transaction_id: txResult.rows[0].id,
      new_balance: newSenderBalance,
      currency: currencyCode,
      message: `Transfer of ${amount.toFixed(2)} ${currencyCode} completed`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ TransferFunds error:", err.message);
    publishLog({
      actor_id: from_client_id,
      actor_type: "client",
      action: "PAYMENT_COMPLETED",
      status: "FAILURE",
      message: err.message,
    });
    callback(null, { success: false, message: err.message });
  } finally {
    client.release();
  }
}

module.exports = { TransferFunds };
