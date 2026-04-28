const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('node:path');
const http = require('node:http');
const config = require('./config');
const {
    ListUsers,
    RegisterUser,
    UpdateUser,
    DeleteUser,
    ListClients,
    UpdateClient,
    DeleteClient,
} = require('./handlers/user-management');

const protoPath = path.join(__dirname, '../node_modules/@myapp/proto-contracts/proto');
const userProtoPath = path.join(protoPath, 'user.proto');

const packageDefinition = protoLoader.loadSync(userProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

const server = new grpc.Server();

server.addService(userProto.UserService.service, {
    ListUsers,
    RegisterUser,
    UpdateUser,
    DeleteUser,
    ListClients,
    UpdateClient,
    DeleteClient,
});

server.bindAsync(
    `0.0.0.0:${config.port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error('❌ Failed to start user-service:', err);
            process.exit(1);
        }
        console.log(`🚀 User Service listening on port ${port}`);
    }
);

const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'user-service' }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

healthServer.listen(Number(config.healthPort), () => {
    console.log(`🩺 User health endpoint listening on port ${config.healthPort}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    healthServer.close(() => {
        server.tryShutdown(() => {
            console.log('Server shut down');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    healthServer.close(() => {
        server.tryShutdown(() => {
            console.log('Server shut down');
            process.exit(0);
        });
    });
});
