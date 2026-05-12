const amqp = require(`amqplib`);

const QUEUE = "account-events";
const AMQP_URL = process.env.RABBITMQ_URL || "amqp://app:secret@rabbitmq:5672";

let channelPromise = null;

async function createChannel() {
  const connection = await amqp.connect(AMQP_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });

  connection.on("error", () => {
    channelPromise = null;
  });
  connection.on("close", () => {
    channelPromise = null;
  });

  console.log("[AccountEventsProducer] RabbitMQ channel ready");
  return channel;
}

function ensureChannel() {
  if (!channelPromise) {
    channelPromise = createChannel();
  }
  return channelPromise;
}

async function publishAccountEvent(payload) {
  const channel = await ensureChannel();
  const sent = channel.sendToQueue(
    QUEUE,
    Buffer.from(JSON.stringify(payload)),
    {
      persistent: true,
    },
  );

  if (!sent) {
    throw new Error("Failed to enqueue account event");
  }
}

module.exports = { publishAccountEvent };
