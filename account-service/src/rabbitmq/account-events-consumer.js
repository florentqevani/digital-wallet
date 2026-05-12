const amqp = require("amqplib");
const { pool } = require("../db");
const { createEvent } = require("./log-producer");

const QUEUE = "account-events";
const AMQP_URL = process.env.RABBITMQ_URL || "amqp://app:secret@rabbitmq:5672";

async function handleCreateAccount(payload) {
  const currencyCode = String(payload.currency || "")
    .trim()
    .toUpperCase();
  if (!payload.client_id || !currencyCode) {
    throw new Error("client_id and currency are required");
  }

  await pool.query(
    `INSERT INTO accounts (client_id, currency, balance, status, created_at, updated_at)
     VALUES ($1, $2, 0, 'ACTIVE', NOW(), NOW())
     ON CONFLICT (client_id, currency) DO NOTHING`,
    [payload.client_id, currencyCode],
  );
}

async function handleDeleteAccount(payload) {
  if (!payload.account_id) {
    throw new Error("account_id is required");
  }

  const { rows } = await pool.query(
    "SELECT balance FROM accounts WHERE id = $1",
    [payload.account_id],
  );

  if (rows.length === 0) {
    throw new Error(`Account ${payload.account_id} not found`);
  }

  if (parseFloat(rows[0].balance) > 0) {
    throw new Error(
      `Account ${payload.account_id} cannot be deleted: balance is ${rows[0].balance}`,
    );
  }

  await pool.query("DELETE FROM accounts WHERE id = $1", [payload.account_id]);
}

async function handleUpdateAccountStatus(payload) {
  const normalizedStatus =
    payload.status === "active"
      ? "ACTIVE"
      : payload.status === "suspended" || payload.status === "inactive"
        ? "INACTIVE"
        : "";

  if (!payload.account_id || !normalizedStatus) {
    throw new Error("account_id and valid status are required");
  }

  await pool.query(
    "UPDATE accounts SET status = $1, updated_at = NOW() WHERE id = $2",
    [normalizedStatus, payload.account_id],
  );
}

async function processMessage(msg, channel) {
  let payload;
  try {
    payload = JSON.parse(msg.content.toString());
  } catch {
    console.error("[AccountEventsConsumer] Invalid JSON, discarding message");
    channel.nack(msg, false, false);
    return;
  }

  try {
    switch (payload.type) {
      case "CREATE_ACCOUNT":
        await handleCreateAccount(payload);
        createEvent({
          actor_id: payload.requested_by || "system",
          actor_type: "account",
          action: "CREATE_ACCOUNT",
          status: "SUCCESS",
          message: `Account created for client ${payload.client_id} (${payload.currency})`,
          timestamp: Date.now(),
        });
        break;
      case "DELETE_ACCOUNT":
        await handleDeleteAccount(payload);
        createEvent({
          actor_id: payload.requested_by || "system",
          actor_type: "account",
          action: "DELETE_ACCOUNT",
          status: "SUCCESS",
          message: `Account ${payload.account_id} deleted`,
          timestamp: Date.now(),
        });
        break;
      case "UPDATE_ACCOUNT_STATUS":
        await handleUpdateAccountStatus(payload);
        createEvent({
          actor_id: payload.requested_by || "system",
          actor_type: "account",
          action: "UPDATE_ACCOUNT_STATUS",
          status: "SUCCESS",
          message: `Account ${payload.account_id} status set to ${payload.status}`,
          timestamp: Date.now(),
        });
        break;
      default:
        console.error(
          `[AccountEventsConsumer] Unsupported event type: ${payload.type}`,
        );
        channel.nack(msg, false, false);
        return;
    }

    channel.ack(msg);
    console.log(`[AccountEventsConsumer] Processed ${payload.type}`);
  } catch (error) {
    const action = payload.type || "UNKNOWN";
    createEvent({
      actor_id: payload.requested_by || "system",
      actor_type: "account",
      action,
      status: "ERROR",
      message: error.message,
      timestamp: Date.now(),
    });

    // Business rule violations (balance > 0, not found) must not be requeued
    const isBusinessError =
      error.message.includes("cannot be deleted") ||
      error.message.includes("not found") ||
      error.message.includes("is required");

    console.error(
      `[AccountEventsConsumer] ${isBusinessError ? "Business rule violation" : "DB error"}, ${isBusinessError ? "discarding" : "requeuing"}:`,
      error.message,
    );
    channel.nack(msg, false, !isBusinessError);
  }
}

async function startConsumer() {
  while (true) {
    try {
      const connection = await amqp.connect(AMQP_URL);
      console.log("[AccountEventsConsumer] RabbitMQ connected");
      connection.on("error", (err) =>
        console.error("[AccountEventsConsumer] Connection error:", err.message),
      );
      connection.on("close", () =>
        console.warn("[AccountEventsConsumer] Connection closed"),
      );

      const channel = await connection.createChannel();
      await channel.assertQueue(QUEUE, { durable: true });
      channel.prefetch(5);
      await channel.consume(QUEUE, (msg) => {
        if (!msg) return;
        processMessage(msg, channel).catch((err) => {
          console.error(
            "[AccountEventsConsumer] Error, requeuing:",
            err.message,
          );
          channel.nack(msg, false, true);
        });
      });

      console.log("[AccountEventsConsumer] Consuming queue:", QUEUE);
      await new Promise((_, reject) =>
        connection.once("close", () => reject(new Error("connection closed"))),
      );
    } catch (err) {
      console.error(
        "[AccountEventsConsumer] Connection error, retrying in 5s:",
        err.message,
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

module.exports = { startConsumer };
