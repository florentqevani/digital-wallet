// src/rabbitmq/log-producer.js - Fire-and-forget log publisher for payment events
const amqp = require('amqplib');

const QUEUE    = 'service-logs';
const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://app:secret@rabbitmq:5672';

let _channel = null;

async function _ensureChannel() {
    if (_channel) return _channel;
    const conn = await amqp.connect(AMQP_URL);
    const ch   = await conn.createChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    conn.on('error', () => { _channel = null; });
    conn.on('close', () => { _channel = null; });
    _channel = ch;
    console.log('[Payment/LogProducer] RabbitMQ channel ready');
    return ch;
}

// Pre-connect at startup; failures are non-fatal (will retry on next publish)
_ensureChannel().catch(err =>
    console.warn('[Payment/LogProducer] Initial connect failed (will retry on next write):', err.message)
);

/**
 * Publish a log event to the service-logs queue.
 * @param {{ actor_id: string, actor_type: string, action: string, status: string, message?: string }} payload
 */
function publishLog(payload) {
    const envelope = {
        actor_id:   payload.actor_id,
        actor_type: payload.actor_type,
        action:     payload.action,
        status:     payload.status,
        message:    payload.message || '',
        timestamp:  Date.now(),
    };

    _ensureChannel()
        .then(ch =>
            ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify(envelope)), { persistent: true })
        )
        .catch(err =>
            console.error('[Payment/LogProducer] Failed to publish log:', err.message, '| action:', payload.action)
        );
}

async function shutdown() {
    if (_channel) {
        try { await _channel.close(); } catch (_) {}
        _channel = null;
    }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

module.exports = { publishLog };
