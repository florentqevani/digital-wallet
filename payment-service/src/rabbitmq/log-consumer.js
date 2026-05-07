const amqmp = require('amqplib');
const { writeLog } = require('./log-client');

const AMQP_URL = process.env.RABBITMQ_URL || 'amqp://app:secret@rabbitmq:5672';
const QUEUE = 'service-logs';
async function consumeLogs() {
    try {
        const conn = await amqmp.connect(AMQP_URL);
        const ch = await conn.createChannel();
        await ch.assertQueue(QUEUE, { durable: true });
        console.log('[LogTransferts] Connected to RabbitMQ, waiting for logs...');
        ch.consume(QUEUE, msg => {
            if (msg) {
                try {
                    const logEntry = JSON.parse(msg.content.toString());
                    // Here you can transform the logEntry if needed before writing to log-order
                    writeLog(logEntry);
                } catch (err) {
                    console.error('[LogTransferts] Failed to process log message:', err.message);
                } finally {
                    ch.ack(msg);
                }
            }
        });
        conn.on('error', err => {
            console.error('[LogTransferts] RabbitMQ connection error:', err.message);
            setTimeout(consumeLogs, 5000); // Retry after delay
        });
        conn.on('close', () => {
            console.warn('[LogTransferts] RabbitMQ connection closed, retrying...');
            setTimeout(consumeLogs, 5000); // Retry after delay
        }
        );
    } catch (err) {
        console.error('[LogTransferts] Failed to connect to RabbitMQ:', err.message);
        setTimeout(consumeLogs, 5000); // Retry after delay
    }
}

consumeLogs();
