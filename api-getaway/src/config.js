// src/config.js - Configuration loader

require("dotenv").config();

const config = {
  // Server
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || "development",

  // Services
  authServiceUrl: process.env.AUTH_SERVICE_URL || "localhost:50051",
  logServiceUrl: process.env.LOG_SERVICE_URL || "localhost:50052",
  userServiceUrl: process.env.USER_SERVICE_URL || "localhost:50053",
  clientServiceUrl: process.env.CLIENT_SERVICE_URL || "localhost:50053",
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || "localhost:50055",

  // Auth
  jwtSecret:
    process.env.JWT_SECRET || "your-secret-key-change-this-in-production",

  // Rate Limiting
  rateLimitWindowMs:
    Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  rateLimitMaxRequests:
    Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
};

console.log("📋 Config loaded:", {
  port: config.port,
  authServiceUrl: config.authServiceUrl,
  logServiceUrl: config.logServiceUrl,
  rateLimitWindow: `${config.rateLimitWindowMs / 1000}s`,
  rateLimitMax: config.rateLimitMaxRequests,
});

module.exports = config;
