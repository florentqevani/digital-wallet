// src/handlers/user-management.js - User and client CRUD handlers

const bcrypt = require("bcrypt");
const pool = require("../db");
const { createEvent } = require("../log-producer");

async function resolveActorType(userId, explicitRole) {
  if (explicitRole === "user" || explicitRole === "superadmin") {
    return explicitRole;
  }

  if (!userId) {
    return "superadmin";
  }

  try {
    const roleResult = await pool.query(
      "SELECT role FROM users WHERE id = $1 LIMIT 1",
      [userId],
    );
    return roleResult.rows[0]?.role === "user" ? "user" : "superadmin";
  } catch (_) {
    return "superadmin";
  }
}

async function RegisterUser(call, callback) {
  const { email, password, name, role, created_by } = call.request;

  try {
    if (!email || !password) {
      return callback(null, {
        success: false,
        message: "Email and password are required",
      });
    }

    const safeRole = role === "superadmin" ? "superadmin" : "user";
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password_hash, name, role, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [email, hashedPassword, name || "", safeRole],
    );

    createEvent({
      actor_id: created_by || email,
      actor_type: "superadmin",
      action: "REGISTER_USER",
      status: "SUCCESS",
      message: `User registered: ${email} (${safeRole})`,
      timestamp: Date.now(),
    });

    callback(null, { success: true, message: "User registered successfully" });
  } catch (error) {
    createEvent({
      actor_id: created_by || email,
      actor_type: "superadmin",
      action: "REGISTER_USER",
      status: "ERROR",
      message: error.message,
      timestamp: Date.now(),
    });

    callback(null, { success: false, message: error.message });
  }
}

async function ListUsers(call, callback) {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, EXTRACT(EPOCH FROM created_at)::bigint * 1000 AS created_at
             FROM users
             ORDER BY created_at DESC`,
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name || "",
      role: row.role,
      created_at: row.created_at,
    }));

    callback(null, { users });
  } catch (error) {
    callback(error);
  }
}

async function UpdateUser(call, callback) {
  const { id, email, name, role, password, updated_by } = call.request;

  if (!id) {
    return callback(null, { success: false, message: "User id is required" });
  }

  let safeRole = "";
  if (role === "superadmin") safeRole = "superadmin";
  else if (role === "user") safeRole = "user";

  const updates = [];
  const values = [];

  if (email) {
    values.push(email);
    updates.push(`email = $${values.length}`);
  }
  if (name) {
    values.push(name);
    updates.push(`name = $${values.length}`);
  }
  if (safeRole) {
    values.push(safeRole);
    updates.push(`role = $${values.length}`);
  }

  if (password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      values.push(hashedPassword);
      updates.push(`password_hash = $${values.length}`);
    } catch (error) {
      return callback(null, { success: false, message: error.message });
    }
  }

  if (updates.length === 0) {
    return callback(null, {
      success: false,
      message: "At least one field is required to update",
    });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${values.length}`,
      values,
    );

    if (result.rowCount === 0) {
      return callback(null, { success: false, message: "User not found" });
    }

    createEvent({
      actor_id: updated_by || id,
      actor_type: "superadmin",
      action: "UPDATE_USER",
      status: "SUCCESS",
      message: `User updated: ${id}`,
      timestamp: Date.now(),
    });

    callback(null, { success: true, message: "User updated successfully" });
  } catch (error) {
    createEvent({
      actor_id: updated_by || id,
      actor_type: "superadmin",
      action: "UPDATE_USER",
      status: "ERROR",
      message: error.message,
      timestamp: Date.now(),
    });

    callback(null, { success: false, message: error.message });
  }
}

async function DeleteUser(call, callback) {
  const { id, deleted_by } = call.request;

  if (!id) {
    return callback(null, { success: false, message: "User id is required" });
  }

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return callback(null, { success: false, message: "User not found" });
    }

    createEvent({
      actor_id: deleted_by || id,
      actor_type: "superadmin",
      action: "DELETE_USER",
      status: "SUCCESS",
      message: `User deleted: ${id}`,
      timestamp: Date.now(),
    });

    callback(null, { success: true, message: "User deleted successfully" });
  } catch (error) {
    createEvent({
      actor_id: deleted_by || id,
      actor_type: "superadmin",
      action: "DELETE_USER",
      status: "ERROR",
      message: error.message,
      timestamp: Date.now(),
    });

    callback(null, { success: false, message: error.message });
  }
}

async function ListClients(call, callback) {
  try {
    const result = await pool.query(
      `SELECT id, email, COALESCE(name, '') AS name, EXTRACT(EPOCH FROM created_at)::bigint * 1000 AS created_at, COALESCE(account_id::text, '') AS account_id, COALESCE(currency, '') AS currency, COALESCE(balance, 0)::float AS balance
             FROM clients
             ORDER BY created_at DESC`,
    );

    const clients = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at,
      account_id: row.account_id,
      currency: row.currency,
      balance: parseFloat(row.balance),
    }));

    callback(null, { clients });
  } catch (error) {
    callback(error);
  }
}

async function UpdateClient(call, callback) {
  const { id, email, name, password, updated_by, updated_by_role } =
    call.request;

  if (!id) {
    return callback(null, { success: false, message: "Client id is required" });
  }

  const updates = [];
  const values = [];

  if (email) {
    values.push(email);
    updates.push(`email = $${values.length}`);
  }
  if (name) {
    values.push(name);
    updates.push(`name = $${values.length}`);
  }

  if (password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      values.push(hashedPassword);
      updates.push(`password_hash = $${values.length}`);
    } catch (error) {
      return callback(null, { success: false, message: error.message });
    }
  }

  if (updates.length === 0) {
    return callback(null, {
      success: false,
      message: "At least one field is required to update",
    });
  }

  values.push(id);

  try {
    const actorType = await resolveActorType(updated_by, updated_by_role);

    const result = await pool.query(
      `UPDATE clients SET ${updates.join(", ")} WHERE id = $${values.length}`,
      values,
    );

    if (result.rowCount === 0) {
      return callback(null, { success: false, message: "Client not found" });
    }

    createEvent({
      actor_id: updated_by || id,
      actor_type: actorType,
      action: "UPDATE_CLIENT",
      status: "SUCCESS",
      message: `Client updated: ${id}`,
      timestamp: Date.now(),
    });

    callback(null, { success: true, message: "Client updated successfully" });
  } catch (error) {
    const actorType = await resolveActorType(updated_by, updated_by_role);

    createEvent({
      actor_id: updated_by || id,
      actor_type: actorType,
      action: "UPDATE_CLIENT",
      status: "ERROR",
      message: error.message,
      timestamp: Date.now(),
    });

    callback(null, { success: false, message: error.message });
  }
}

async function DeleteClient(call, callback) {
  const { id, deleted_by, deleted_by_role } = call.request;

  if (!id) {
    return callback(null, { success: false, message: "Client id is required" });
  }
  const balanceResult = await pool.query(
    "SELECT COALESCE(SUM(balance), 0)::float AS total FROM accounts WHERE client_id = $1",
    [id],
  );
  if (balanceResult.rows.length > 0) {
    const balance = parseFloat(balanceResult.rows[0].total);
    if (balance > 0) {
      return callback(null, {
        success: false,
        message: "Account cannot be deleted: transfer funds first",
      });
    }
  }

  try {
    const actorType = await resolveActorType(deleted_by, deleted_by_role);

    const result = await pool.query("DELETE FROM clients WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return callback(null, { success: false, message: "Client not found" });
    }

    createEvent({
      actor_id: deleted_by || id,
      actor_type: actorType,
      action: "DELETE_CLIENT",
      status: "SUCCESS",
      message: `Client deleted: ${id}`,
      timestamp: Date.now(),
    });

    callback(null, { success: true, message: "Client deleted successfully" });
  } catch (error) {
    const actorType = await resolveActorType(deleted_by, deleted_by_role);

    createEvent({
      actor_id: deleted_by || id,
      actor_type: actorType,
      action: "DELETE_CLIENT",
      status: "ERROR",
      message: error.message,
      timestamp: Date.now(),
    });

    callback(null, { success: false, message: error.message });
  }
}

module.exports = {
  RegisterUser,
  ListUsers,
  UpdateUser,
  DeleteUser,
  ListClients,
  UpdateClient,
  DeleteClient,
  SetCurrency,
  SetBalance,
  AddBalance,
  GetClientBalance,
};

async function AddBalance(call, callback) {
  const { client_id, amount } = call.request;

  if (!client_id) {
    return callback(null, {
      success: false,
      message: "client_id is required",
      balance: 0,
    });
  }

  const delta = parseFloat(amount);
  if (isNaN(delta) || delta <= 0) {
    return callback(null, {
      success: false,
      message: "amount must be a positive number",
      balance: 0,
    });
  }

  try {
    const result = await pool.query(
      "UPDATE clients SET balance = balance + $1 WHERE id = $2 RETURNING balance",
      [delta, client_id],
    );

    if (result.rowCount === 0) {
      return callback(null, {
        success: false,
        message: "Client not found",
        balance: 0,
      });
    }

    const newBalance = parseFloat(result.rows[0].balance);
    callback(null, {
      success: true,
      message: `Deposited ${delta}. New balance: ${newBalance.toFixed(2)}`,
      balance: newBalance,
    });
  } catch (error) {
    callback(null, { success: false, message: error.message, balance: 0 });
  }
}

async function GetClientBalance(call, callback) {
  const { client_id } = call.request;

  if (!client_id) {
    return callback(null, { balance: 0, currency: "ALL" });
  }

  try {
    const result = await pool.query(
      `SELECT COALESCE(balance, 0)::float AS balance, COALESCE(currency, 'ALL') AS currency FROM clients WHERE id = $1`,
      [client_id],
    );

    if (result.rowCount === 0) {
      return callback(null, { balance: 0, currency: "ALL" });
    }

    callback(null, {
      balance: parseFloat(result.rows[0].balance),
      currency: result.rows[0].currency,
    });
  } catch (error) {
    callback(null, { balance: 0, currency: "ALL" });
  }
}

async function SetBalance(call, callback) {
  const { client_id, balance } = call.request;

  if (!client_id) {
    return callback(null, { success: false, message: "client_id is required" });
  }

  const amount = parseFloat(balance);
  if (isNaN(amount) || amount < 0) {
    return callback(null, {
      success: false,
      message: "balance must be a non-negative number",
    });
  }

  try {
    const result = await pool.query(
      "UPDATE clients SET balance = $1 WHERE id = $2 RETURNING id",
      [amount, client_id],
    );

    if (result.rowCount === 0) {
      return callback(null, { success: false, message: "Client not found" });
    }

    callback(null, { success: true, message: `Balance set to ${amount}` });
  } catch (error) {
    callback(null, { success: false, message: error.message });
  }
}

async function SetCurrency(call, callback) {
  const { client_id, currency } = call.request;

  if (!client_id || !currency) {
    return callback(null, {
      success: false,
      message: "client_id and currency are required",
    });
  }

  const allowed = ["ALL", "USD", "EUR", "GBP"];
  if (!allowed.includes(currency.toUpperCase())) {
    return callback(null, {
      success: false,
      message: `Currency must be one of: ${allowed.join(", ")}`,
    });
  }

  try {
    const result = await pool.query(
      "UPDATE clients SET currency = $1 WHERE id = $2 RETURNING id",
      [currency.toUpperCase(), client_id],
    );

    if (result.rowCount === 0) {
      return callback(null, { success: false, message: "Client not found" });
    }

    callback(null, {
      success: true,
      message: `Currency set to ${currency.toUpperCase()}`,
    });
  } catch (error) {
    callback(null, { success: false, message: error.message });
  }
}
