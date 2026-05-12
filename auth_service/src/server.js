// src/server.js - Auth Service gRPC server

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("node:path");
const http = require("node:http");
const config = require("./config");
const { RegisterClient } = require("./handlers/register");
const { LoginClient, LoginUser } = require("./handlers/login");
const { ValidateToken } = require("./handlers/validate");
const { CreateToken } = require("./handlers/token");

// Load proto definition
const protoPath = path.join(
  __dirname,
  "../node_modules/@myapp/proto-contracts/proto",
);
const authProtoPath = path.join(protoPath, "auth.proto");

const packageDefinition = protoLoader.loadSync(authProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

// Create gRPC server
const server = new grpc.Server();

// Add the AuthService and its handlers
server.addService(authProto.AuthService.service, {
  RegisterClient,
  LoginClient,
  LoginUser,
  ValidateToken,
  CreateToken,
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
    console.log(`Auth Service listening on port ${port}`);
  },
);

const healthPort = Number(process.env.HEALTH_PORT || 15051);
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "auth-service" }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

healthServer.listen(healthPort, () => {
  console.log(`Auth health endpoint listening on port ${healthPort}`);
});

// Graceful shutdown
function shutdown() {
  const forceKill = setTimeout(() => {
    console.log("Force exiting after timeout");
    process.exit(0);
  }, 3000);
  forceKill.unref();
  healthServer.close(() => {
    server.tryShutdown(() => {
      clearTimeout(forceKill);
      console.log("Server shut down");
      process.exit(0);
    });
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
