const amq = require('amqplib');
const { pool } = require('../db');

const QUEUE = 'add-currency';
const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://app:secret@rabbitmq:5672';

async function processMessage(msg, ch) {
    let payload;
    try { payload = JSON.parse(msg.content.toString()); }
    catch {
        console.error('[CurrencyConsumer] Invalid JSON, discarding message');
        ch.nack(msg, false, false);
        return;
    }

    const { client_id, currency } = payload;
    if (!client_id || !currency) {
        console.error('[CurrencyConsumer] Missing client_id or currency, discarding:', payload);
        ch.nack(msg, false, false);
        return;
    }

    try {
        const result = await pool.query('UPDATE clients SET currency = $1 WHERE id = $2 RETURNING id', [currency, client_id]);
        if (result.rowCount === 0) {
            console.error('[CurrencyConsumer] Client not found:', client_id);
            ch.nack(msg, false, false);
            return;
        }
        ch.ack(msg);
        console.log(`✅ [CurrencyConsumer] Currency ${currency} added to client ${client_id}`);
    } catch (error) {
        console.error('[CurrencyConsumer] DB error, requeuing:', error.message);
        ch.nack(msg, false, true);
    }
}

async function startConsumer() {
    while (true) {
        try {
            const conn = await amq.connect(AMQP_URL);
            console.log('[CurrencyConsumer] RabbitMQ connected');
            conn.on('error', err => console.error('[CurrencyConsumer] Connection error:', err.message));
            conn.on('close', () => console.warn('[CurrencyConsumer] Connection closed'));
            const ch = await conn.createChannel();
            await ch.assertQueue(QUEUE, { durable: true });
            ch.prefetch(5);
            await ch.consume(QUEUE, msg => {
                if (!msg) return;
                processMessage(msg, ch).catch(err => {
                    console.error('[CurrencyConsumer] DB error, requeuing:', err.message);
                    ch.nack(msg, false, true);
                });
            }
            );
            console.log('[CurrencyConsumer] Consuming queue:', QUEUE);
            await new Promise((_, reject) =>
                conn.once('close', () => reject(new Error('connection closed')))
            );
        } catch (err) {
            console.error('[CurrencyConsumer] Connection error, retrying in 5s:', err.message);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

module.exports = { startConsumer };
