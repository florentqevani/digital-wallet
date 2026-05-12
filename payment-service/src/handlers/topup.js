// src/handlers/topup.js - Admin top-up: credits a client's balance

const pool = require("../db");
const { publishLog } = require("../rabbitmq/log-producer");

async function AdminTopUp(call, callback) {
  const {
    admin_id,
    actor_type = "user",
    client_id,
    amount,
    currency = "ALL",
    note = "",
  } = call.request;

  const currencyCode = String(currency).trim().toUpperCase() || "ALL";

  if (!client_id) {
    return callback(null, { success: false, message: "client_id is required" });
  }
  if (!amount || amount <= 0) {
    return callback(null, {
      success: false,
      message: "amount must be greater than zero",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify client exists
    const clientResult = await client.query(
      "SELECT id, email FROM clients WHERE id = $1 FOR UPDATE",
      [client_id],
    );
    if (clientResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return callback(null, { success: false, message: "Client not found" });
    }

    const clientEmail = clientResult.rows[0].email;

    // Upsert into accounts table (creates account for currency if it doesn't exist)
    const accountResult = await client.query(
      `INSERT INTO accounts (client_id, currency, balance, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
       ON CONFLICT (client_id, currency)
       DO UPDATE SET balance = accounts.balance + $3, updated_at = NOW()
       RETURNING balance`,
      [client_id, currencyCode, amount],
    );

    const newAccountBalance = parseFloat(accountResult.rows[0].balance);

    // For backward compat: also update legacy clients.balance for ALL currency
    let newBalance = newAccountBalance;
    if (currencyCode === "ALL") {
      const legacyResult = await client.query(
        "UPDATE clients SET balance = balance + $1 WHERE id = $2 RETURNING balance",
        [amount, client_id],
      );
      newBalance = parseFloat(legacyResult.rows[0].balance);
    }

    // Record transaction
    const txResult = await client.query(
      `INSERT INTO transactions (from_client_id, to_client_id, amount, currency, type, status, note)
       VALUES (NULL, $1, $2, $3, 'TOPUP', 'COMPLETED', $4)
       RETURNING id`,
      [client_id, amount, currencyCode, note || "Admin top-up"],
    );

    await client.query("COMMIT");

    console.log(
      `✓ Admin top-up ${amount} ${currencyCode} → client ${clientEmail} (account balance: ${newAccountBalance})`,
    );

    publishLog({
      actor_id: admin_id || "System",
      actor_type: actor_type,
      action: "TOPUP",
      status: "SUCCESS",
      message: `Top-up of ${amount.toFixed(2)} ${currencyCode} applied to ${clientEmail}. New balance: ${newAccountBalance.toFixed(2)} ${currencyCode}. Tx: ${txResult.rows[0].id}`,
    });

    callback(null, {
      success: true,
      transaction_id: txResult.rows[0].id,
      new_balance: newAccountBalance,
      currency: currencyCode,
      message: `Top-up of ${amount.toFixed(2)} ${currencyCode} applied. New balance: ${newAccountBalance.toFixed(2)} ${currencyCode}`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ AdminTopUp error:", err.message);
    publishLog({
      actor_id: admin_id || "System",
      actor_type: actor_type,
      action: "TOPUP",
      status: "FAILURE",
      message: err.message,
    });
    callback(null, { success: false, message: err.message });
  } finally {
    client.release();
  }
}

module.exports = { AdminTopUp };
