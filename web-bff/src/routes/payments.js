// src/routes/payments.js - Proxy /api/payments/* to the API gateway

"use strict";

const express = require("express");
const { gatewayRequest } = require("../utils/gateway-request");

const router = express.Router();

function extractToken(req) {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : "";
}

// POST /api/payments/topup
router.post("/topup", async (req, res) => {
  try {
    const response = await gatewayRequest("/api/payments/topup", {
      method: "POST",
      body: req.body,
      token: extractToken(req),
    });
    res.json(response);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json(error.payload || { success: false, message: error.message });
  }
});

// POST /api/payments/transfer
router.post("/transfer", async (req, res) => {
  try {
    const response = await gatewayRequest("/api/payments/transfer", {
      method: "POST",
      body: req.body,
      token: extractToken(req),
    });
    res.json(response);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json(error.payload || { success: false, message: error.message });
  }
});

// GET /api/payments/balance?client_id=
router.get("/balance", async (req, res) => {
  try {
    const response = await gatewayRequest("/api/payments/balance", {
      method: "GET",
      query: req.query,
      token: extractToken(req),
    });
    res.json(response);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json(error.payload || { success: false, message: error.message });
  }
});

// GET /api/payments/history?client_id=&limit=&offset=
router.get("/history", async (req, res) => {
  try {
    const response = await gatewayRequest("/api/payments/history", {
      method: "GET",
      query: req.query,
      token: extractToken(req),
    });
    res.json(response);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json(error.payload || { success: false, message: error.message });
  }
});

router.get("/exchange-rates", async (req, res) => {
  try {
    const response = await gatewayRequest("/api/payments/exchange-rates", {
      method: "GET",
      query: req.query,
      token: extractToken(req),
    });
    res.json(response);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json(error.payload || { success: false, message: error.message });
  }
});

module.exports = router;
