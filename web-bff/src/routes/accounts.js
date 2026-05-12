const express = require("express");
const { gatewayRequest } = require("../utils/gateway-request");

const router = express.Router();

function extractToken(req) {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : "";
}

// GET /api/accounts
router.get("/", async (req, res) => {
  try {
    const response = await gatewayRequest("/api/accounts", {
      method: "GET",
      query: req.query,
      token: extractToken(req),
    });
    res.json(response);
  } catch (error) {
    console.error("❌ Accounts route error:", error.message);
    res.status(error.statusCode || 500).json({
      clients: [],
      message: error.payload?.message || error.message,
    });
  }
});

// POST /api/accounts
router.post("/", async (req, res) => {
  try {
    const response = await gatewayRequest("/api/accounts", {
      method: "POST",
      body: req.body,
      token: extractToken(req),
    });
    res.json(response);
  } catch (error) {
    console.error("❌ Create account route error:", error.message);
    res
      .status(error.statusCode || 500)
      .json(error.payload || { success: false, message: error.message });
  }
});

// DELETE /api/accounts/:account_id
router.delete("/:account_id", async (req, res) => {
  try {
    const response = await gatewayRequest(
      `/api/accounts/${req.params.account_id}`,
      {
        method: "DELETE",
        token: extractToken(req),
      },
    );
    res.json(response);
  } catch (error) {
    console.error("❌ Delete account route error:", error.message);
    res
      .status(error.statusCode || 500)
      .json(error.payload || { success: false, message: error.message });
  }
});

// PATCH /api/accounts/:account_id/status
router.patch("/:account_id/status", async (req, res) => {
  try {
    const response = await gatewayRequest(
      `/api/accounts/${req.params.account_id}/status`,
      {
        method: "PATCH",
        body: req.body,
        token: extractToken(req),
      },
    );
    res.json(response);
  } catch (error) {
    console.error("❌ Update account status route error:", error.message);
    res
      .status(error.statusCode || 500)
      .json(error.payload || { success: false, message: error.message });
  }
});

module.exports = router;
