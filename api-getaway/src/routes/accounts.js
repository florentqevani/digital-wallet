const express = require("express");
const { userClient } = require("../grpc-clients");
const { validateJWT } = require("../middleware/jwt-validator");
const { promisifyGRPC } = require("../utils/promise-wrapper");
const { publishAccountEvent } = require("../rabbitmq/account-events-producer");

const router = express.Router();

// GET /api/accounts
router.get(
  "/",
  validateJWT(["superadmin", "user", "client"]),
  async (req, res) => {
    try {
      const requestedClientId =
        req.user.role === "client"
          ? req.user.user_id
          : (req.query.client_id ?? "").toString();
      const response = await promisifyGRPC(
        userClient.ListAccounts.bind(userClient),
        {
          client_id: requestedClientId,
        },
      );
      res.json(response);
    } catch (error) {
      console.error("❌ List accounts error:", error.message);
      return res
        .status(error.httpStatus || 500)
        .json({ accounts: [], total: 0, message: error.message });
    }
  },
);

// POST /api/accounts/self — client creates their own account in a new currency
router.post("/self", validateJWT(["client"]), async (req, res) => {
  try {
    const currency = (req.body.currency ?? req.body.requested_currency ?? "")
      .toString()
      .trim()
      .toUpperCase();
    if (!currency) {
      return res
        .status(400)
        .json({ success: false, message: "currency is required" });
    }
    await publishAccountEvent({
      type: "CREATE_ACCOUNT",
      client_id: req.user.user_id,
      currency,
      requested_by: req.user.user_id,
      requested_by_role: req.user.role,
    });
    res.status(202).json({ success: true, message: "Account creation queued" });
  } catch (error) {
    console.error("❌ Self create account error:", error.message);
    return res
      .status(error.httpStatus || 500)
      .json({ success: false, message: error.message });
  }
});

// POST /api/accounts
router.post("/", validateJWT(["superadmin"]), async (req, res) => {
  try {
    const { client_id, currency } = req.body;
    if (!client_id || !currency) {
      return res.status(400).json({
        success: false,
        message: "client_id and currency are required",
      });
    }
    await publishAccountEvent({
      type: "CREATE_ACCOUNT",
      client_id,
      currency,
      requested_by: req.user.user_id,
      requested_by_role: req.user.role,
    });
    res.status(202).json({
      success: true,
      message: "Account creation queued",
    });
  } catch (error) {
    console.error("❌ Create account error:", error.message);
    return res
      .status(error.httpStatus || 500)
      .json({ success: false, message: error.message });
  }
});

// DELETE /api/accounts/:account_id
router.delete("/:account_id", validateJWT(["superadmin"]), async (req, res) => {
  try {
    const { account_id } = req.params;
    await publishAccountEvent({
      type: "DELETE_ACCOUNT",
      account_id,
      requested_by: req.user.user_id,
      requested_by_role: req.user.role,
    });
    res.status(202).json({ success: true, message: "Account deletion queued" });
  } catch (error) {
    console.error("❌ Delete account error:", error.message);
    return res
      .status(error.httpStatus || 500)
      .json({ success: false, message: error.message });
  }
});

// PATCH /api/accounts/:account_id/status
router.patch(
  "/:account_id/status",
  validateJWT(["superadmin"]),
  async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res
          .status(400)
          .json({ success: false, message: "status is required" });
      }
      await publishAccountEvent({
        type: "UPDATE_ACCOUNT_STATUS",
        account_id: req.params.account_id,
        status,
        requested_by: req.user.user_id,
        requested_by_role: req.user.role,
      });
      res.status(202).json({
        success: true,
        message: "Account status update queued",
      });
    } catch (error) {
      console.error("❌ Update account status error:", error.message);
      return res
        .status(error.httpStatus || 500)
        .json({ success: false, message: error.message });
    }
  },
);

module.exports = router;
