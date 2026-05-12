const pool = require("../db");

async function ListAccounts(call, callback) {
  const { client_id } = call.request;
  try {
    const query = client_id
      ? "SELECT id, client_id, currency, balance, status, EXTRACT(EPOCH FROM created_at)::bigint*1000 as created_at, EXTRACT(EPOCH FROM updated_at)::bigint*1000 as updated_at FROM accounts WHERE client_id = $1 ORDER BY created_at DESC"
      : "SELECT id, client_id, currency, balance, status, EXTRACT(EPOCH FROM created_at)::bigint*1000 as created_at, EXTRACT(EPOCH FROM updated_at)::bigint*1000 as updated_at FROM accounts ORDER BY created_at DESC";

    const params = client_id ? [client_id] : [];
    const result = await pool.query(query, params);
    const accounts = result.rows.map((row) => ({
      id: row.id,
      client_id: row.client_id,
      currency: row.currency,
      balance: parseFloat(row.balance),
      status: row.status === "ACTIVE" ? "active" : "suspended",
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
    }));
    callback(null, { accounts });
  } catch (err) {
    console.error("Error fetching accounts:", err);
    callback({
      code: 500,
      message: "Internal server error",
    });
  }
}

async function CreateAccount(call, callback) {
  const { client_id, currency } = call.request;
  try {
    if (!["USD", "EUR", "GBP"].includes(currency)) {
      return callback({
        code: 400,
        message: "Unsupported currency",
      });
    }

    const result = await pool.query(
      "INSERT INTO accounts (client_id, currency, balance, status) VALUES ($1, $2, 0, 'ACTIVE') RETURNING id, client_id, currency, balance, status, EXTRACT(EPOCH FROM created_at)::bigint*1000 as created_at, EXTRACT(EPOCH FROM updated_at)::bigint*1000 as updated_at",
      [client_id, currency],
    );
    console.log(
      `✓ Account created for client_id: ${client_id}, currency: ${currency}`,
    );
    callback(null, {
      success: true,
      account_id: result.rows[0].id,
      message: "Account created successfully",
    });
  } catch (error) {
    if (error.code === "23505") {
      // Unique violation
      return callback({
        code: 400,
        message: "Account already exists for this client and currency",
      });
    }
    console.error("Error creating account:", error.message);
    callback(error);
  }
}

async function DeleteAccount(call, callback) {
  const { account_id } = call.request;
  try {
    const result = await pool.query(
      "DELETE FROM accounts WHERE id = $1 RETURNING id",
      [account_id],
    );
    if (result.rowCount === 0) {
      return callback({
        code: 404,
        message: "Account not found",
      });
    }
    console.log(`✓ Account deleted: ${account_id}`);
    callback(null, {
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error.message);
    callback(error);
  }
}

async function UpdateAccountStatus(call, callback) {
  const { account_id, status } = call.request;
  try {
    const normalizedStatus =
      status === "active"
        ? "ACTIVE"
        : status === "suspended" || status === "inactive"
          ? "INACTIVE"
          : "";
    if (!normalizedStatus) {
      return callback({
        code: 400,
        message: "Invalid status value",
      });
    }
    const result = await pool.query(
      "UPDATE accounts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
      [normalizedStatus, account_id],
    );
    if (result.rowCount === 0) {
      return callback({
        code: 404,
        message: "Account not found",
      });
    }
    console.log(
      `✓ Account status updated: ${account_id} -> ${normalizedStatus}`,
    );
    callback(null, {
      success: true,
      message: "Account status updated successfully",
    });
  } catch (error) {
    console.error("Error updating account status:", error.message);
    callback(error);
  }
}

module.exports = {
  ListAccounts,
  CreateAccount,
  DeleteAccount,
  UpdateAccountStatus,
};
