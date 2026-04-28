// src/grpc-clients.js - gRPC client connections to microservices

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
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

// Load Auth Service proto
const authProto = loadProto('auth.proto');
console.log(`✓ Auth proto loaded`);

// Load Log Service proto
const logProto = loadProto('log.proto');
console.log(`✓ Log proto loaded`);

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

module.exports = {
    authClient,
    logClient,
};