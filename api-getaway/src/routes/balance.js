const express = require("express");
const { userClient } = require("../grpc-clients");
const { validateJWT } = require("../middleware/jwt-validator");
const { promisifyGRPC } = require("../utils/promise-wrapper");

const router = express.Router();

// GET /api/balance — returns the authenticated client's own balance
router.get(
  "/",
  validateJWT(["client", "user", "superadmin"]),
  async (req, res) => {
    try {
      const response = await promisifyGRPC(
        userClient.GetClientBalance.bind(userClient),
        {
          client_id: req.user.user_id,
        },
      );
      res.json({ balance: response.balance, currency: response.currency });
    } catch (error) {
      console.error("❌ Get balance error:", error.message);
      res
        .status(error.httpStatus || 500)
        .json({ balance: 0, currency: "ALL", message: error.message });
    }
  },
);

// POST /api/balance/add — adds an amount to the authenticated client's balance
router.post(
  "/add",
  validateJWT(["client", "user", "superadmin"]),
  async (req, res) => {
    try {
      const amount = parseFloat(req.body.amount);
      if (isNaN(amount) || amount <= 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "amount must be a positive number",
          });
      }

      const response = await promisifyGRPC(
        userClient.AddBalance.bind(userClient),
        {
          client_id: req.user.user_id,
          amount,
        },
      );

      if (!response.success) {
        return res.status(400).json(response);
      }

      res.json(response);
    } catch (error) {
      console.error("❌ Add balance error:", error.message);
      res
        .status(error.httpStatus || 500)
        .json({ success: false, message: error.message, balance: 0 });
    }
  },
);

module.exports = router;
