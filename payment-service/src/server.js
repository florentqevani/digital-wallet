'use strict';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const http = require('http');
const path = require('path');
const config = require('./config');
const { initiatePayment, confirmPayment } = require('./handlers/payment');

const protoPath = path.join(
    __dirname,
    '../node_modules/@myapp/proto-contracts/proto/payment.proto'
);

const packageDef = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const { payment } = grpc.loadPackageDefinition(packageDef);

const server = new grpc.Server();

server.addService(payment.PaymentService.service, {
    InitiatePayment: initiatePayment,
    ConfirmPayment: confirmPayment,
});

server.bindAsync(
    `0.0.0.0:${config.port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error('Failed to start Payment Service:', err.message);
            process.exit(1);
        }
        console.log(`\n Payment Service gRPC listening on port ${port}`);
    }
);

// HTTP health check endpoint
const healthPort = Number(process.env.HEALTH_PORT || 15055);
const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'payment-service' }));
        return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

healthServer.listen(healthPort, () => {
    console.log(`Payment Service health endpoint listening on port ${healthPort}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    healthServer.close(() => {
        server.tryShutdown(() => {
            console.log('Payment Service stopped.');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('\nShutting down Payment Service...');
    healthServer.close(() => {
        server.tryShutdown(() => {
            console.log('Payment Service stopped.');
            process.exit(0);
        });
    });
});

