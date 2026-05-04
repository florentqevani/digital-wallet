// src/rabbitmq/account-producer.js - Publishes a client-registered event for account-service
const amqp = require('amqplib');

const QUEUE = 'client-registered';
const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://app:secret@rabbitmq:5672';

let _channel = null;

async function _ensureChannel() {
    if (_channel) return _channel;
    const conn = await amqp.connect(AMQP_URL);
    const ch = await conn.createChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    conn.on('error', () => { _channel = null; });
    conn.on('close', () => { _channel = null; });
    _channel = ch;
    console.log('[AccountProducer] RabbitMQ channel ready');
    return ch;
}

_ensureChannel().catch(err =>
    console.warn('[AccountProducer] Initial connect failed (will retry on next write):', err.message)
);

function publishClientRegistered(clientId) {
    const payload = { client_id: clientId };
    _ensureChannel()
        .then(ch =>
            ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify(payload)), { persistent: true })
        )
        .catch(err =>
            console.error('[AccountProducer] Failed to publish:', err.message, '| client_id:', clientId)
        );
}

module.exports = { publishClientRegistered };
