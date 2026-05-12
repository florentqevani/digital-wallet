const express = require("express");
const { gatewayRequest } = require("../utils/gateway-request");

const router = express.Router();

function extractToken(req) {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
}

router.get("/", async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorised" });
  }

  try {
    const response = await gatewayRequest("/api/accounts", {
      method: "GET",
      token,
    });
    res.json(response);
  } catch (error) {
    console.error("❌ Mobile accounts route error:", error.message);
    res.status(error.statusCode || 500).json({
      accounts: [],
      message: error.payload?.message || error.message,
    });
  }
});

router.post("/request-currency", async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorised" });
  }

  try {
    const response = await gatewayRequest("/api/accounts/request-currency", {
      method: "POST",
      body: req.body,
      token,
    });
    res.status(response.success ? 201 : 400).json(response);
  } catch (error) {
    console.error("❌ Mobile request currency route error:", error.message);
    res
      .status(error.statusCode || 500)
      .json(error.payload || { success: false, message: error.message });
  }
});

module.exports = router;
