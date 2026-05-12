const pool = require("../db");

async function queryLogs(call, callback) {
  const {
    actor_type,
    actor_id,
    action,
    from,
    to,
    page = 1,
    limit = 50,
  } = call.request;

  try {
    const conditions = [];
    const params = [];

    if (actor_type && actor_type !== "") {
      conditions.push("actor_type = $" + (params.length + 1));
      params.push(actor_type);
    }

    // Handle actor_id: resolve email to UUID if needed
    let resolvedActorId = actor_id;
    if (actor_id && actor_id !== "") {
      // Check if actor_id is an email
      if (actor_id.includes("@")) {
        try {
          // Try to resolve as client email
          if (actor_type === "client" || !actor_type) {
            const clientRes = await pool.query(
              "SELECT id FROM clients WHERE email = $1 LIMIT 1",
              [actor_id],
            );
            if (clientRes.rows.length > 0) {
              resolvedActorId = clientRes.rows[0].id;
            }
          }
          // Try to resolve as user email
          if (!resolvedActorId || resolvedActorId === actor_id) {
            const userRes = await pool.query(
              "SELECT id FROM users WHERE email = $1 LIMIT 1",
              [actor_id],
            );
            if (userRes.rows.length > 0) {
              resolvedActorId = userRes.rows[0].id;
            }
          }
        } catch (e) {
          console.warn(`Could not resolve email ${actor_id}:`, e.message);
          // Fall back to original actor_id in case of DB error
        }
      }

      conditions.push("actor_id = $" + (params.length + 1));
      params.push(resolvedActorId);
    }

    if (action && action !== "") {
      if (action.includes("%")) {
        conditions.push("action LIKE $" + (params.length + 1));
      } else {
        conditions.push("action = $" + (params.length + 1));
      }
      params.push(action);
    }
    const fromValue = Number(from);
    const toValue = Number(to);

    if (Number.isFinite(fromValue) && fromValue > 0) {
      conditions.push(
        "created_at >= to_timestamp($" + (params.length + 1) + "/1000.0)",
      );
      params.push(fromValue);
    }
    if (Number.isFinite(toValue) && toValue > 0) {
      conditions.push(
        "created_at <= to_timestamp($" + (params.length + 1) + "/1000.0)",
      );
      params.push(toValue);
    }
    // Build the WHERE clause
    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Calculate pagination
    const safeLimit = Math.min(Math.max(Number.parseInt(limit) || 50, 1), 1000); // Min 1, Max 1000
    const safePage = Math.max(Number.parseInt(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    params.push(safeLimit, offset);

    const logsResult = await pool.query(
      `SELECT id, actor_id, actor_type, action, status, message, 
              EXTRACT(EPOCH FROM created_at)::bigint * 1000 as timestamp
       FROM logs 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM logs ${whereClause}`,
      params.slice(0, -2), // Exclude limit and offset for count query
    );

    const total = Number.parseInt(countResult.rows[0].count);

    console.log(
      `✓ Logs queried: ${logsResult.rows.length} results (total: ${total})`,
    );

    // Convert results to proto format
    const logs = logsResult.rows.map((row) => ({
      id: row.id,
      actor_id: row.actor_id,
      actor_type: row.actor_type,
      action: row.action,
      status: row.status,
      message: row.message || "",
      timestamp: row.timestamp,
    }));

    callback(null, {
      logs,
      total,
    });
  } catch (error) {
    console.error("Error querying logs:", error);
    return callback(error);
  }
}

module.exports = { QueryLogs: queryLogs };
