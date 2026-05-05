'use strict';

// Fire-and-forget RabbitMQ log publisher.
// Publishes to the shared 'service-logs' queue consumed by log-service.
// Payment operations are never blocked by log-service availability.

const amqp = require('amqplib');

const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://app:secret@rabbitmq:5672';
const QUEUE = 'service-logs';

let _channel = null;

async function _ensureChannel() {
    if (_channel) return _channel;
    const conn = await amqp.connect(AMQP_URL);
    const ch = await conn.createChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    conn.on('error', () => { _channel = null; });
    conn.on('close', () => { _channel = null; });
    _channel = ch;
    console.log('[PaymentLogProducer] RabbitMQ channel ready');
    return ch;
}

_ensureChannel().catch(err =>
    console.warn('[PaymentLogProducer] Initial connect failed (will retry on next write):', err.message)
);

/**
 * Publish a payment log entry (fire-and-forget via RabbitMQ).
 * @param {object} payload - { actor_id, actor_type, action, status, message }
 */
function writeLog(payload) {
    const entry = { ...payload, timestamp: payload.timestamp || Date.now() };
    _ensureChannel()
        .then(ch =>
            ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify(entry)), { persistent: true })
        )
        .catch(err =>
            console.error('[PaymentLogProducer] Failed to publish log:', err.message, '| action:', entry.action)
        );
}

async function shutdown() {
    if (_channel) {
        try { await _channel.close(); } catch (_) { }
        _channel = null;
    }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { writeLog };
