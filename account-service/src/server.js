// src/server.js - Account Service entry point
const config = require('./config');
const { startConsumer } = require('./rabbitmq/rmq-consumer');
const { startConsumer: startCurrencyConsumer } = require('./rabbitmq/rmq-currency');

async function main() {
    console.log(`\n🚀 Account Service starting (env: ${config.nodeEnv})`);

    await startConsumer();
    await startCurrencyConsumer();
}

main().catch((err) => {
    console.error('❌ Account Service fatal error:', err.message);
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
