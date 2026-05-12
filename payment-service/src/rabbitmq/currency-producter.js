const amqp = require("amqplib");

const QUEUE = "account-events";
const AMQP_URL = process.env.RABBITMQ_URL || "amqp://app:secret@rabbitmq:5672";

let _channel = null;

async function _ensureChannel() {
  if (_channel) return _channel;

  const connection = await amqp.connect(AMQP_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });

  connection.on("error", () => {
    _channel = null;
  });
  connection.on("close", () => {
    _channel = null;
  });

  _channel = channel;
  console.log("[CurrencyProducer] RabbitMQ channel ready");
  return channel;
}

_ensureChannel().catch((err) =>
  console.warn(
    "[CurrencyProducer] Initial connect failed (will retry on publish):",
    err.message,
  ),
);

function publishCurrencyApproved(payload) {
  _ensureChannel()
    .then((ch) =>
      ch.sendToQueue(
        QUEUE,
        Buffer.from(
          JSON.stringify({
            type: "CREATE_ACCOUNT",
            client_id: payload.client_id,
            currency: payload.currency,
            request_id: payload.request_id,
            source: "currency_request_approved",
          }),
        ),
        {
          persistent: true,
        },
      ),
    )
    .catch((err) =>
      console.error(
        "[CurrencyProducer] Failed to publish account event:",
        err.message,
      ),
    );
}

async function shutdown() {
  if (_channel) {
    try {
      await _channel.close();
    } catch (_) {}
    _channel = null;
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = { publishCurrencyApproved };
