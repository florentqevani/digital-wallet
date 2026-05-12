// src/rmq-consumer.js - Consumes client-registered events and assigns an account_id
const amqp = require("amqplib");
const { randomUUID } = require("crypto");
const { pool } = require("../db");

const QUEUE = "client-registered";
const AMQP_URL = process.env.RABBITMQ_URL || "amqp://app:secret@rabbitmq:5672";
const RETRY_DELAY = 5000;

async function processMessage(msg, ch) {
  let payload;
  try {
    payload = JSON.parse(msg.content.toString());
  } catch {
    console.error("[AccountConsumer] Invalid JSON, discarding message");
    ch.nack(msg, false, false);
    return;
  }

  const { client_id } = payload;
  if (!client_id) {
    console.error("[AccountConsumer] Missing client_id, discarding:", payload);
    ch.nack(msg, false, false);
    return;
  }

  const account_id = randomUUID();

  await pool.query("UPDATE clients SET account_id = $1 WHERE id = $2", [
    account_id,
    client_id,
  ]);

  await pool.query(
    `INSERT INTO accounts (client_id, currency, balance, status, created_at, updated_at)
         VALUES ($1, 'ALL', 0, 'ACTIVE', NOW(), NOW())
         ON CONFLICT (client_id, currency) DO NOTHING`,
    [client_id],
  );

  ch.ack(msg);
  console.log(
    `✅ [AccountConsumer] account_id ${account_id} assigned and ALL account created for client ${client_id}`,
  );
}

async function startConsumer() {
  while (true) {
    try {
      const conn = await amqp.connect(AMQP_URL);
      console.log("[AccountConsumer] RabbitMQ connected");

      conn.on("error", (err) =>
        console.error("[AccountConsumer] Connection error:", err.message),
      );
      conn.on("close", () =>
        console.warn("[AccountConsumer] Connection closed"),
      );

      const ch = await conn.createChannel();
      await ch.assertQueue(QUEUE, { durable: true });
      ch.prefetch(5);

      await ch.consume(QUEUE, (msg) => {
        if (!msg) return;
        processMessage(msg, ch).catch((err) => {
          console.error("[AccountConsumer] DB error, requeuing:", err.message);
          ch.nack(msg, false, true);
        });
      });

      console.log("[AccountConsumer] Consuming queue:", QUEUE);

      await new Promise((_, reject) =>
        conn.once("close", () => reject(new Error("connection closed"))),
      );
    } catch (err) {
      console.error(
        `[AccountConsumer] ${err.message} — reconnecting in ${RETRY_DELAY}ms`,
      );
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
}

module.exports = { startConsumer };
