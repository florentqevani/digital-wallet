// src/rabbitmq/log-producer.js - Fire-and-forget log writer for account events
const amqp = require("amqplib");

const QUEUE = "service-logs";
const AMQP_URL = process.env.RABBITMQ_URL || "amqp://app:secret@rabbitmq:5672";

let _channel = null;

async function _ensureChannel() {
  if (_channel) return _channel;
  const conn = await amqp.connect(AMQP_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue(QUEUE, { durable: true });
  conn.on("error", () => {
    _channel = null;
  });
  conn.on("close", () => {
    _channel = null;
  });
  _channel = ch;
  console.log("[AccountLogProducer] RabbitMQ channel ready");
  return ch;
}

_ensureChannel().catch((err) =>
  console.warn(
    "[AccountLogProducer] Initial connect failed (will retry on next write):",
    err.message,
  ),
);

function createEvent(payload) {
  _ensureChannel()
    .then((ch) =>
      ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      }),
    )
    .catch((err) =>
      console.error(
        "[AccountLogProducer] Failed to publish log:",
        err.message,
        "| action:",
        payload.action,
      ),
    );
}

module.exports = { createEvent };
