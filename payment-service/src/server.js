'use strict';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
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

//health check endpoint
server.addService(payment.HealthCheckService.service, {
    Check: (call, callback) => {
        callback(null, { status: 'SERVING' });
    },
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down Payment Service...');
    server.tryShutdown(() => {
        console.log('Payment Service stopped.');
        process.exit(0);
    });
});

