"use strict";

const express = require("express");
const { paymentClient, userClient } = require("../grpc-clients");
const { validateJWT } = require("../middleware/jwt-validator");
const { promisifyGRPC } = require("../utils/promise-wrapper");

const router = express.Router();

// ── POST /api/payments/transfer ───────────────────────────────────────────────
// Authenticated client sends funds to another client.
//   Body: { to_client_id, amount, note? }
router.post("/transfer", validateJWT(["client"]), async (req, res) => {
  const { to_client_id, note, currency } = req.body;
  const amount = parseFloat(req.body.amount);

  if (!to_client_id) {
    return res
      .status(400)
      .json({ success: false, message: "to_client_id is required" });
  }
  if (isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "amount must be a positive number" });
  }

  try {
    const response = await promisifyGRPC(
      paymentClient.TransferFunds.bind(paymentClient),
      {
        from_client_id: req.user.user_id,
        to_client_id,
        amount,
        currency: currency || "ALL",
        note: note || "",
      },
    );
    res.status(response.success ? 200 : 400).json(response);
  } catch (err) {
    console.error("❌ Transfer error:", err.message);
    res.status(502).json({ success: false, message: "Transfer failed" });
  }
});

// ── POST /api/payments/transfer-by-email ─────────────────────────────────────
// Client sends funds to another client identified by email address.
//   Body: { to_email, amount, note? }
router.post("/transfer-by-email", validateJWT(["client"]), async (req, res) => {
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
    // Resolve email → client_id via the user service
    const clientList = await promisifyGRPC(
      userClient.ListClients.bind(userClient),
      {},
    );
    const recipient = (clientList.clients || []).find(
      (c) => c.email.toLowerCase() === to_email.trim().toLowerCase(),
    );
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: `No client found with email: ${to_email}`,
      });
    }
    if (recipient.id === req.user.user_id) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot transfer funds to yourself" });
    }

    const response = await promisifyGRPC(
      paymentClient.TransferFunds.bind(paymentClient),
      {
        from_client_id: req.user.user_id,
        to_client_id: recipient.id,
        amount,
        currency: currency || "ALL",
        note: note || "",
      },
    );
    res.status(response.success ? 200 : 400).json({
      ...response,
      recipient_name: recipient.name,
      recipient_email: recipient.email,
    });
  } catch (err) {
    console.error("❌ Transfer-by-email error:", err.message);
    res.status(502).json({ success: false, message: "Transfer failed" });
  }
});

// ── POST /api/payments/topup ──────────────────────────────────────────────────
// Admin/superadmin credits a client's balance (creates money in the system).
//   Body: { client_id, amount, note? }
router.post("/topup", validateJWT(["superadmin", "user"]), async (req, res) => {
  const { client_id, note, currency } = req.body;
  const amount = parseFloat(req.body.amount);

  if (!client_id) {
    return res
      .status(400)
      .json({ success: false, message: "client_id is required" });
  }
  if (isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "amount must be a positive number" });
  }

  try {
    const response = await promisifyGRPC(
      paymentClient.AdminTopUp.bind(paymentClient),
      {
        admin_id: req.user.user_id,
        actor_type: req.user.role,
        client_id,
        amount,
        currency: currency || "ALL",
        note: note || "",
      },
    );
    res.status(response.success ? 200 : 400).json(response);
  } catch (err) {
    console.error("❌ TopUp error:", err.message);
    res.status(502).json({ success: false, message: "Top-up failed" });
  }
});

// ── GET /api/payments/balance ─────────────────────────────────────────────────
// Client checks their own balance.
// Admin can check any client's balance with ?client_id=<uuid>
router.get(
  "/balance",
  validateJWT(["client", "superadmin", "user"]),
  async (req, res) => {
    let client_id = req.user.user_id;

    // Admins may pass an explicit client_id query param
    if (req.user.role !== "client" && req.query.client_id) {
      client_id = req.query.client_id;
    }

    try {
      const response = await promisifyGRPC(
        paymentClient.GetBalance.bind(paymentClient),
        { client_id },
      );
      res.status(response.success ? 200 : 404).json(response);
    } catch (err) {
      console.error("❌ GetBalance error:", err.message);
      res
        .status(502)
        .json({ success: false, message: "Could not retrieve balance" });
    }
  },
);

// ── GET /api/payments/history ─────────────────────────────────────────────────
// Client sees their own transaction history (paginated).
// Admin can query any client's history with ?client_id=<uuid>, or all transactions by omitting it.
// Query params: limit (default 50, max 200), offset (default 0)
router.get(
  "/history",
  validateJWT(["client", "superadmin", "user"]),
  async (req, res) => {
    // Clients always see only their own history
    // Admins/users: pass explicit client_id to filter, or omit to get all transactions
    let client_id;
    if (req.user.role === "client") {
      client_id = req.user.user_id;
    } else {
      client_id = req.query.client_id || "";
    }

    const limit = Math.min(
      Math.max(1, parseInt(req.query.limit || "50", 10)),
      200,
    );
    const offset = Math.max(0, parseInt(req.query.offset || "0", 10));

    try {
      const response = await promisifyGRPC(
        paymentClient.GetTransactionHistory.bind(paymentClient),
        { client_id, limit, offset },
      );
      res.json(response);
    } catch (err) {
      console.error("❌ GetTransactionHistory error:", err.message);
      res.status(502).json({
        success: false,
        transactions: [],
        total: 0,
        message: "Could not retrieve history",
      });
    }
  },
);

// ── POST /api/payments/credit-request ────────────────────────────────────────
// Authenticated client requests money from another client by email.
//   Body: { payer_email, amount, note? }
router.post("/credit-request", validateJWT(["client"]), async (req, res) => {
  const { payer_email, note, currency } = req.body;
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
    const response = await promisifyGRPC(
      paymentClient.CreateCreditRequest.bind(paymentClient),
      {
        requester_id: req.user.user_id,
        payer_email: payer_email.trim(),
        amount,
        currency: (currency || "ALL").toUpperCase(),
        note: note || "",
      },
    );
    res.status(response.success ? 201 : 400).json(response);
  } catch (err) {
    console.error("❌ CreateCreditRequest error:", err.message);
    res
      .status(502)
      .json({ success: false, message: "Could not create credit request" });
  }
});

// ── GET /api/payments/credit-requests ────────────────────────────────────────
// Returns credit requests for the authenticated client.
//   Query: direction (sent|received, default both), status (PENDING|ACCEPTED|REJECTED|CANCELLED, default PENDING), limit, offset
router.get("/credit-requests", validateJWT(["client"]), async (req, res) => {
  const direction = req.query.direction || "";
  const status_filter = req.query.status || "PENDING";
  const limit = Math.min(
    Math.max(1, parseInt(req.query.limit || "50", 10)),
    200,
  );
  const offset = Math.max(0, parseInt(req.query.offset || "0", 10));

  try {
    const response = await promisifyGRPC(
      paymentClient.GetCreditRequests.bind(paymentClient),
      { client_id: req.user.user_id, direction, status_filter, limit, offset },
    );
    res.json(response);
  } catch (err) {
    console.error("❌ GetCreditRequests error:", err.message);
    res.status(502).json({
      success: false,
      requests: [],
      total: 0,
      message: "Could not retrieve credit requests",
    });
  }
});

// ── POST /api/payments/credit-request/:id/respond ────────────────────────────
// Payer accepts or rejects a pending credit request.
//   Body: { accept: true|false }
router.post(
  "/credit-request/:id/respond",
  validateJWT(["client"]),
  async (req, res) => {
    const request_id = req.params.id;
    const accept = req.body.accept === true || req.body.accept === "true";

    if (!request_id) {
      return res
        .status(400)
        .json({ success: false, message: "request id is required" });
    }

    try {
      const response = await promisifyGRPC(
        paymentClient.RespondCreditRequest.bind(paymentClient),
        { request_id, payer_id: req.user.user_id, accept },
      );
      res.status(response.success ? 200 : 400).json(response);
    } catch (err) {
      console.error("❌ RespondCreditRequest error:", err.message);
      res.status(502).json({
        success: false,
        message: "Could not respond to credit request",
      });
    }
  },
);

router.get(
  "/exchange-rates",
  validateJWT(["client", "user", "superadmin"]),
  async (req, res) => {
    try {
      const response = await promisifyGRPC(
        paymentClient.GetExchangeRates.bind(paymentClient),
        { base_currency: req.query.base || req.query.base_currency || "USD" },
      );
      res.json(response);
    } catch (err) {
      console.error("❌ GetExchangeRates error:", err.message);
      res.status(502).json({
        success: false,
        base_currency: req.query.base_currency || "USD",
        rates: [],
        fetched_at: 0,
        message: "Could not retrieve exchange rates",
      });
    }
  },
);

module.exports = router;
