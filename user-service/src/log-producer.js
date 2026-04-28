// src/log-producer.js - RabbitMQ publisher for fire-and-forget log writes
const amqp = require('amqplib');

const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://app:secret@rabbitmq:5672';
const QUEUE = process.env.RABBITMQ_QUEUE || 'service-logs';

let _channel = null;

async function _ensureChannel() {
    if (_channel) return _channel;
    const conn = await amqp.connect(AMQP_URL);
    const ch = await conn.createChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    conn.on('error', () => { _channel = null; });
    conn.on('close', () => { _channel = null; });
    _channel = ch;
    console.log('[LogProducer] RabbitMQ channel ready');
    return ch;
}

_ensureChannel().catch(err =>
    console.warn('[LogProducer] Initial connect failed (will retry on next write):', err.message)
);

function writeLog(payload) {
    _ensureChannel()
        .then(ch =>
            ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify(payload)), { persistent: true })
        )
        .catch(err =>
            console.error('[LogProducer] Failed to publish log:', err.message, '| action:', payload.action)
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
