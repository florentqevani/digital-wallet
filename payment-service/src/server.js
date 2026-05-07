// src/server.js - Payment Service gRPC server

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("node:path");
const http = require("node:http");
const config = require("./config");

const { TransferFunds } = require("./handlers/payment-process");
const { AdminTopUp } = require("./handlers/topup");
const { GetBalance } = require("./handlers/balance");
const { GetTransactionHistory } = require("./handlers/history");
const { CreateCreditRequest } = require("./handlers/credit-request");
const { GetCreditRequests } = require("./handlers/get-credit-request");
const { RespondCreditRequest } = require("./handlers/credit-response");

// Load proto
const protoPath = path.join(
  __dirname,
  "../node_modules/@myapp/proto-contracts/proto/payment.proto",
);
const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const paymentProto = grpc.loadPackageDefinition(packageDefinition).payment;

// Create gRPC server
const server = new grpc.Server();
server.addService(paymentProto.PaymentService.service, {
  TransferFunds,
  AdminTopUp,
  GetBalance,
  GetTransactionHistory,
  CreateCreditRequest,
  GetCreditRequests,
  RespondCreditRequest,
});

server.bindAsync(
  `0.0.0.0:${config.port}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("Failed to start gRPC server:", err);
      process.exit(1);
    }
    console.log(`✓ Payment Service listening on port ${port}`);
  },
);

// Health endpoint
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "payment-service" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

healthServer.listen(config.healthPort, () => {
  console.log(`✓ Payment health endpoint on port ${config.healthPort}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  healthServer.close(() => {
    server.tryShutdown(() => process.exit(0));
  });
});
