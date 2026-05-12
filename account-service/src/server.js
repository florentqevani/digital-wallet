// src/server.js - Account Service gRPC server

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("node:path");
const http = require("node:http");
const config = require("./config");
const { ListAccounts } = require("./handlers/listAccounts");
const { startConsumer } = require("./rabbitmq/rmq-consumer");
const {
  startConsumer: startAccountEventsConsumer,
} = require("./rabbitmq/account-events-consumer");

// Load proto definition
const protoPath = path.join(
  __dirname,
  "../node_modules/@myapp/proto-contracts/proto",
);
const userProtoPath = path.join(protoPath, "user.proto");

const packageDefinition = protoLoader.loadSync(userProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// Create gRPC server
const server = new grpc.Server();

// Add the UserService and its handlers
server.addService(userProto.UserService.service, {
  ListAccounts,
});

// Start the server
server.bindAsync(
  `0.0.0.0:${config.port}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
    console.log(`Account Service listening on port ${port}`);

    // Start RabbitMQ consumers
    startConsumer().catch((err) =>
      console.error("Consumer error:", err.message),
    );
    startAccountEventsConsumer().catch((err) =>
      console.error("Account events consumer error:", err.message),
    );
  },
);

const healthPort = Number(process.env.HEALTH_PORT || 15055);
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "account-service" }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

healthServer.listen(healthPort, () => {
  console.log(`Account health endpoint listening on port ${healthPort}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  healthServer.close(() => {
    server.tryShutdown(() => {
      console.log("Server shut down");
      process.exit(0);
    });
  });
});
