// src/routes/logs.js - Audit logging routes for back-office

const express = require("express");
const { gatewayRequest } = require("../utils/gateway-request");

const router = express.Router();

function extractToken(req) {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : "";
}

// ── GET /api/logs/my-logs
router.get("/my-logs", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const response = await gatewayRequest("/api/logs/my-logs", {
      method: "GET",
      token: extractToken(req),
      query: {
        page: Number.parseInt(page) || 1,
        limit: Math.min(Number.parseInt(limit) || 20, 100),
      },
    });

    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching logs:", error.message);
    res.status(error.statusCode || 500).json({
      error: "Failed to fetch logs",
      message: error.payload?.message || error.message,
    });
  }
});

// ── GET /api/logs/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const response = await gatewayRequest("/api/logs/dashboard", {
      method: "GET",
      token: extractToken(req),
    });

    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching dashboard:", error.message);
    res.status(error.statusCode || 500).json({
      error: "Failed to fetch dashboard",
      message: error.payload?.message || error.message,
    });
  }
});

// ── GET /api/logs/all
router.get("/all", async (req, res) => {
  try {
    const { actor_type, actor_id, from, to, page = 1, limit = 50 } = req.query;

    const response = await gatewayRequest("/api/logs/all", {
      method: "GET",
      token: extractToken(req),
      query: {
        actor_type: actor_type || "",
        actor_id: actor_id || "",
        from: from ? Number.parseInt(from) : 0,
        to: to ? Number.parseInt(to) : 0,
        page: Number.parseInt(page) || 1,
        limit: Math.min(Number.parseInt(limit) || 50, 100),
      },
    });

    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching logs:", error.message);
    res.status(error.statusCode || 500).json({
      error: "Failed to fetch logs",
      message: error.payload?.message || error.message,
    });
  }
});

// ── GET /api/logs/payments
// Back-office payment logs. Optional query: actor_id, from, to, page, limit
router.get("/payments", async (req, res) => {
  try {
    const { actor_id, from, to, page = 1, limit = 50 } = req.query;

    const response = await gatewayRequest("/api/logs/payments", {
      method: "GET",
      token: extractToken(req),
      query: {
        actor_id: actor_id || "",
        from: from ? Number.parseInt(from) : 0,
        to: to ? Number.parseInt(to) : 0,
        page: Number.parseInt(page) || 1,
        limit: Math.min(Number.parseInt(limit) || 50, 100),
      },
    });

    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching payment logs:", error.message);
    res.status(error.statusCode || 500).json({
      error: "Failed to fetch payment logs",
      message: error.payload?.message || error.message,
    });
  }
});

// ── GET /api/logs/clients
router.get("/clients", async (req, res) => {
  try {
    const { actor_id, from, to, page = 1, limit = 50 } = req.query;

    const response = await gatewayRequest("/api/logs/clients", {
      method: "GET",
      token: extractToken(req),
      query: {
        actor_id: actor_id || "",
        from: from ? Number.parseInt(from) : 0,
        to: to ? Number.parseInt(to) : 0,
        page: Number.parseInt(page) || 1,
        limit: Math.min(Number.parseInt(limit) || 50, 100),
      },
    });

    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching client logs:", error.message);
    res.status(error.statusCode || 500).json({
      error: "Failed to fetch client logs",
      message: error.payload?.message || error.message,
    });
  }
});

// ── GET /api/logs/accounts
router.get("/accounts", async (req, res) => {
  try {
    const { actor_email, action, from, to, page = 1, limit = 50 } = req.query;

    const response = await gatewayRequest("/api/logs/accounts", {
      method: "GET",
      token: extractToken(req),
      query: {
        actor_email: actor_email || "",
        action: action || "",
        from: from ? Number.parseInt(from) : 0,
        to: to ? Number.parseInt(to) : 0,
        page: Number.parseInt(page) || 1,
        limit: Math.min(Number.parseInt(limit) || 50, 100),
      },
    });

    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching account logs:", error.message);
    res.status(error.statusCode || 500).json({
      error: "Failed to fetch account logs",
      message: error.payload?.message || error.message,
    });
  }
});

module.exports = router;
