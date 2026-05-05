// src/server.js - Log Service gRPC server

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('node:path');
const http = require('node:http');
const config = require('./config');
const { WriteLog } = require('./handlers/write-log');
const { QueryLogs } = require('./handlers/query-logs');
const { startConsumer } = require('./rmq-consumer');

// Load proto definition
const protoPath = path.join(__dirname, '../node_modules/@myapp/proto-contracts/proto');
const logProtoPath = path.join(protoPath, 'log.proto');

const packageDefinition = protoLoader.loadSync(logProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const logProto = grpc.loadPackageDefinition(packageDefinition).log;

// Create gRPC server
const server = new grpc.Server();

// Add the LogService and its handlers
server.addService(logProto.LogService.service, {
    WriteLog,
    QueryLogs,
});

// Start the server
server.bindAsync(
    `0.0.0.0:${config.port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error('Failed to start server:', err);
            process.exit(1);
        }
        console.log(`Log Service listening on port ${port}`);

        // Start RabbitMQ consumer — handles its own reconnect loop internally
        startConsumer().catch(err => console.error('Consumer error:', err.message));
    }
);

const healthPort = Number(process.env.HEALTH_PORT || 15052);
const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'log-service' }));
        return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

healthServer.listen(healthPort, () => {
    console.log(`Log health endpoint listening on port ${healthPort}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    healthServer.close(() => {
        server.tryShutdown(() => {
            console.log('Server shut down');
            process.exit(0);
        });
    });
});
