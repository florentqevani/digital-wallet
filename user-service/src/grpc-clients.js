// src/grpc-clients.js - gRPC client connections

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('node:path');
const config = require('./config');

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

const logProto = loadProto('log.proto');

const logClient = new logProto.log.LogService(
    config.logServiceUrl,
    grpc.credentials.createInsecure()
);

console.log(`✓ Log Service client connected to ${config.logServiceUrl}`);

module.exports = { logClient };
