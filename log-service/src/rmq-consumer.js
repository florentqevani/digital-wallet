// src/rmq-consumer.js - RabbitMQ consumer: writes log messages to PostgreSQL
const amqp = require('amqplib');
const pool = require('./db');

const QUEUE = 'service-logs';
const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://app:secret@rabbitmq:5672';
const RETRY_DELAY = 5000;

async function processMessage(msg, ch) {
    let payload;
    try { payload = JSON.parse(msg.content.toString()); }
    catch {
        console.error('[LogConsumer] Invalid JSON, discarding message');
        ch.nack(msg, false, false);
        return;
    }

    const { actor_id, actor_type, action, status, message, timestamp } = payload;
    if (!actor_id || !actor_type || !action || !status) {
        console.error('[LogConsumer] Missing required fields, discarding:', payload);
        ch.nack(msg, false, false);
        return;
    }

    await pool.query(
        `INSERT INTO logs (actor_id, actor_type, action, status, message, created_at)
         VALUES ($1, $2, $3, $4, $5, to_timestamp($6/1000.0))`,
        [actor_id, actor_type, action, status, message || '', timestamp || Date.now()]
    );
    ch.ack(msg);
    console.log(`✓ [LogConsumer] Wrote log: ${actor_type}/${action}/${status}`);
}

async function startConsumer() {
    // Infinite reconnect loop — automatically recovers from RabbitMQ restarts
    while (true) {
        try {
            const conn = await amqp.connect(AMQP_URL);
            console.log('[LogConsumer] RabbitMQ connected');

            conn.on('error', err => console.error('[LogConsumer] Connection error:', err.message));
            conn.on('close', () => console.warn('[LogConsumer] Connection closed'));

            const ch = await conn.createChannel();
            await ch.assertQueue(QUEUE, { durable: true });
            ch.prefetch(10);

            await ch.consume(QUEUE, msg => {
                if (!msg) return;
                processMessage(msg, ch).catch(err => {
                    console.error('[LogConsumer] DB error, requeuing:', err.message);
                    ch.nack(msg, false, true);
                });
            });

            console.log('[LogConsumer] Consuming queue:', QUEUE);

            // Block until the connection dies, then fall through to reconnect
            await new Promise((_, reject) => conn.once('close', () => reject(new Error('connection closed'))));
        } catch (err) {
            console.error(`[LogConsumer] ${err.message} — reconnecting in ${RETRY_DELAY}ms`);
            await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
    }
}

module.exports = { startConsumer };
