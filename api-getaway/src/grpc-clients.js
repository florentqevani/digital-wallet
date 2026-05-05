// src/grpc-clients.js - gRPC client connections to all microservices

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('node:path');
const config = require('./config');

// Load proto definitions
const protoPath = path.join(__dirname, '../node_modules/@myapp/proto-contracts/proto');

function loadProto(filename) {
    const filepath = path.join(protoPath, filename);
    return grpc.loadPackageDefinition(
        protoLoader.loadSync(filepath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        })
    );
}

// Load protos
const authProto = loadProto('auth.proto');
console.log(`✓ Auth proto loaded`);

const logProto = loadProto('log.proto');
console.log(`✓ Log proto loaded`);

const userProto = loadProto('user.proto');
console.log(`✓ User proto loaded`);

const paymentProto = loadProto('payment.proto');
console.log(`✓ Payment proto loaded`);

// Create gRPC clients
const authClient = new authProto.auth.AuthService(
    config.authServiceUrl,
    grpc.credentials.createInsecure()
);
console.log(`✓ Auth Service client connected to ${config.authServiceUrl}`);

const logClient = new logProto.log.LogService(
    config.logServiceUrl,
    grpc.credentials.createInsecure()
);
console.log(`✓ Log Service client connected to ${config.logServiceUrl}`);

const userClient = new userProto.user.UserService(
    config.userServiceUrl,
    grpc.credentials.createInsecure()
);
console.log(`✓ User Service client connected to ${config.userServiceUrl}`);

const paymentClient = new paymentProto.payment.PaymentService(
    config.paymentServiceUrl,
    grpc.credentials.createInsecure()
);
console.log(`✓ Payment Service client connected to ${config.paymentServiceUrl}`);

module.exports = {
    authClient,
    logClient,
    userClient,
    paymentClient,
};