"use strict";

const express = require("express");
const { gatewayRequest } = require("../utils/gateway-request");

const router = express.Router();

function extractToken(req) {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
}

// ─── POST /api/payments/transfer ─────────────────────────────────────────────
// Client sends funds to another client by recipient email.
// Body: { to_email, amount, note? }
router.post("/transfer", async (req, res) => {
  const token = extractToken(req);
  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorised" });

  const { to_email, note, currency } = req.body;
  const amount = parseFloat(req.body.amount);

  if (!to_email || typeof to_email !== "string" || !to_email.includes("@")) {
    return res.status(400).json({
      success: false,
      message: "to_email must be a valid email address",
    });
  }
  if (isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "amount must be a positive number" });
  }

  try {
    const response = await gatewayRequest("/api/payments/transfer-by-email", {
      method: "POST",
      body: {
        to_email: to_email.trim(),
        amount,
        note: note || "",
        currency: currency || "ALL",
      },
      token,
    });
    res.json(response);
  } catch (err) {
    console.error("[payments/transfer]", err.message);
    res.status(err.statusCode || 502).json({
      success: false,
      message: err.message || "Transfer failed",
    });
  }
});

// ─── GET /api/payments/balance ────────────────────────────────────────────────
// Returns the authenticated client's own wallet balance.
router.get("/balance", async (req, res) => {
  const token = extractToken(req);
  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorised" });

  try {
    const response = await gatewayRequest("/api/payments/balance", { token });
    res.json(response);
  } catch (err) {
    console.error("[payments/balance]", err.message);
    res
      .status(err.statusCode || 502)
      .json({ success: false, message: err.message });
  }
});

// ─── GET /api/payments/history ────────────────────────────────────────────────
// Returns the authenticated client's paginated transaction history.
// Query: limit, offset
router.get("/history", async (req, res) => {
  const token = extractToken(req);
  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorised" });

  try {
    const response = await gatewayRequest("/api/payments/history", {
      token,
      query: {
        limit: req.query.limit || "20",
        offset: req.query.offset || "0",
      },
    });
    res.json(response);
  } catch (err) {
    console.error("[payments/history]", err.message);
    res.status(err.statusCode || 502).json({
      success: false,
      transactions: [],
      total: 0,
      message: err.message,
    });
  }
});

// ─── POST /api/payments/credit-request ───────────────────────────────────────
// Authenticated client requests money from another client by email.
// Body: { payer_email, amount, note? }
router.post("/credit-request", async (req, res) => {
  const token = extractToken(req);
  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorised" });

  const { payer_email, note } = req.body;
  const amount = parseFloat(req.body.amount);

  if (
    !payer_email ||
    typeof payer_email !== "string" ||
    !payer_email.includes("@")
  ) {
    return res.status(400).json({
      success: false,
      message: "payer_email must be a valid email address",
    });
  }
  if (isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "amount must be a positive number" });
  }

  try {
    const response = await gatewayRequest("/api/payments/credit-request", {
      method: "POST",
      body: { payer_email: payer_email.trim(), amount, note: note || "" },
      token,
    });
    res.status(response.success ? 201 : 400).json(response);
  } catch (err) {
    console.error("[payments/credit-request]", err.message);
    res.status(err.statusCode || 502).json({
      success: false,
      message: err.message || "Could not create credit request",
    });
  }
});

// ─── GET /api/payments/credit-requests ───────────────────────────────────────
// Returns credit requests for the authenticated client.
// Query: direction (sent|received), status (default PENDING), limit, offset
router.get("/credit-requests", async (req, res) => {
  const token = extractToken(req);
  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorised" });

  try {
    const response = await gatewayRequest("/api/payments/credit-requests", {
      token,
      query: {
        direction: req.query.direction || "",
        status: req.query.status || "PENDING",
        limit: req.query.limit || "50",
        offset: req.query.offset || "0",
      },
    });
    res.json(response);
  } catch (err) {
    console.error("[payments/credit-requests]", err.message);
    res
      .status(err.statusCode || 502)
      .json({ success: false, requests: [], total: 0, message: err.message });
  }
});

// ─── POST /api/payments/credit-request/:id/respond ───────────────────────────
// Payer accepts or rejects a pending credit request.
// Body: { accept: true|false }
router.post("/credit-request/:id/respond", async (req, res) => {
  const token = extractToken(req);
  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorised" });

  const requestId = req.params.id;
  const accept = req.body.accept === true || req.body.accept === "true";

  if (!requestId) {
    return res
      .status(400)
      .json({ success: false, message: "request id is required" });
  }

  try {
    const response = await gatewayRequest(
      `/api/payments/credit-request/${requestId}/respond`,
      {
        method: "POST",
        body: { accept },
        token,
      },
    );
    res.status(response.success ? 200 : 400).json(response);
  } catch (err) {
    console.error("[payments/credit-request/respond]", err.message);
    res.status(err.statusCode || 502).json({
      success: false,
      message: err.message || "Could not respond to credit request",
    });
  }
});

module.exports = router;
