// src/routes/logs.js - Logging passthrough routes

const express = require("express");
const { logClient } = require("../grpc-clients");
const { apiLimiter } = require("../middleware/rate-limiter");
const { promisifyGRPC } = require("../utils/promise-wrapper");
const { validateJWT } = require("../middleware/jwt-validator");

const router = express.Router();

// POST /logs/write
router.post("/write", apiLimiter, async (req, res) => {
  try {
    const { actor_id, actor_type, action, status, message, timestamp } =
      req.body;

    if (!actor_id || !actor_type || !action || !status) {
      return res.status(400).json({
        saved: false,
        message: "actor_id, actor_type, action, and status are required",
      });
    }

    const response = await promisifyGRPC(logClient.WriteLog.bind(logClient), {
      actor_id,
      actor_type,
      action,
      status,
      message: message || "",
      timestamp: timestamp || Date.now(),
    });

    return res.json(response);
  } catch (error) {
    console.error("Write log error:", error.message);
    return res.status(500).json({
      saved: false,
      message: error.message,
    });
  }
});

// POST /logs/query
router.post("/query", apiLimiter, async (req, res) => {
  try {
    const { actor_type, actor_id, from, to, page = 1, limit = 50 } = req.body;

    const response = await promisifyGRPC(logClient.QueryLogs.bind(logClient), {
      actor_type: actor_type || "",
      actor_id: actor_id || "",
      action: req.body.action || "",
      from: from ? Number.parseInt(from, 10) : 0,
      to: to ? Number.parseInt(to, 10) : 0,
      page: Number.parseInt(page, 10) || 1,
      limit: Math.min(Number.parseInt(limit, 10) || 50, 100),
    });

    return res.json(response);
  } catch (error) {
    console.error("Query logs error:", error.message);
    return res.status(500).json({
      logs: [],
      total: 0,
      message: error.message,
    });
  }
});

// GET /logs/my-logs
router.get(
  "/my-logs",
  validateJWT(["user", "superadmin"]),
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const response = await promisifyGRPC(
        logClient.QueryLogs.bind(logClient),
        {
          actor_type: req.user.role,
          actor_id: req.user.user_id,
          page: Number.parseInt(page, 10) || 1,
          limit: Math.min(Number.parseInt(limit, 10) || 20, 100),
        },
      );

      return res.json(response);
    } catch (error) {
      console.error("Error fetching my-logs:", error.message);
      return res.status(500).json({
        error: "Failed to fetch logs",
        message: error.message,
      });
    }
  },
);

// GET /logs/dashboard
router.get(
  "/dashboard",
  validateJWT(["user", "superadmin"]),
  async (req, res) => {
    try {
      // Fetch last 14 days so the chart has enough data to bucket per day
      const from14d = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const CHART_LIMIT = 500;

      if (req.user.role === "user") {
        const [ownLogsResponse, clientLogsResponse] = await Promise.all([
          promisifyGRPC(logClient.QueryLogs.bind(logClient), {
            actor_type: "user",
            actor_id: req.user.user_id,
            from: from14d,
            page: 1,
            limit: CHART_LIMIT,
          }),
          promisifyGRPC(logClient.QueryLogs.bind(logClient), {
            actor_type: "client",
            from: from14d,
            page: 1,
            limit: CHART_LIMIT,
          }),
        ]);

        const ownLogs = ownLogsResponse.logs || [];
        const clientLogs = clientLogsResponse.logs || [];
        const allLogs = [...ownLogs, ...clientLogs];
        const errorCount = allLogs.filter(
          (log) => log.status === "ERROR",
        ).length;
        const successCount = allLogs.filter(
          (log) => log.status === "SUCCESS",
        ).length;

        return res.json({
          clientLogs,
          userLogs: ownLogs,
          summary: {
            totalClientLogs: clientLogsResponse.total || 0,
            totalUserLogs: ownLogsResponse.total || 0,
            errorCount,
            successCount,
          },
        });
      }

      const [clientLogsResponse, userLogsResponse, superadminLogsResponse] =
        await Promise.all([
          promisifyGRPC(logClient.QueryLogs.bind(logClient), {
            actor_type: "client",
            from: from14d,
            page: 1,
            limit: CHART_LIMIT,
          }),
          promisifyGRPC(logClient.QueryLogs.bind(logClient), {
            actor_type: "user",
            from: from14d,
            page: 1,
            limit: CHART_LIMIT,
          }),
          promisifyGRPC(logClient.QueryLogs.bind(logClient), {
            actor_type: "superadmin",
            from: from14d,
            page: 1,
            limit: CHART_LIMIT,
          }),
        ]);

      const clientLogs = clientLogsResponse.logs || [];
      const combinedUserLogs = [
        ...(userLogsResponse.logs || []),
        ...(superadminLogsResponse.logs || []),
      ].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

      const allLogs = [
        ...clientLogs,
        ...(userLogsResponse.logs || []),
        ...(superadminLogsResponse.logs || []),
      ];
      const errorCount = allLogs.filter((log) => log.status === "ERROR").length;
      const successCount = allLogs.filter(
        (log) => log.status === "SUCCESS",
      ).length;

      return res.json({
        clientLogs,
        userLogs: combinedUserLogs,
        summary: {
          totalClientLogs: clientLogsResponse.total || 0,
          totalUserLogs:
            (userLogsResponse.total || 0) + (superadminLogsResponse.total || 0),
          errorCount,
          successCount,
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error.message);
      return res.status(500).json({
        error: "Failed to fetch dashboard",
        message: error.message,
      });
    }
  },
);

// GET /logs/all
// For staff roles (user / superadmin) this endpoint is scoped to staff actor types only
// (actor_type = 'user' | 'superadmin'). Client logs are served exclusively via /logs (client-logs page).
// When no actor_type is supplied by a superadmin, two parallel queries are merged so that
// client rows never leak into the staff log view.
router.get("/all", validateJWT(["user", "superadmin"]), async (req, res) => {
  try {
    const { actor_type, actor_id, from, to, page = 1, limit = 50 } = req.query;

    const safeLimit = Math.min(Number.parseInt(limit, 10) || 50, 100);
    const safePage = Number.parseInt(page, 10) || 1;
    const grpcBase = {
      actor_id: "",
      action: req.query.action || "",
      from: from ? Number.parseInt(from, 10) : 0,
      to: to ? Number.parseInt(to, 10) : 0,
      page: safePage,
      limit: safeLimit,
    };

    // 'user' role: always scoped to their own entries, never clients
    if (req.user.role === "user") {
      const response = await promisifyGRPC(
        logClient.QueryLogs.bind(logClient),
        {
          ...grpcBase,
          actor_type: "user",
          actor_id: req.user.user_id,
        },
      );
      return res.json(response);
    }

    // superadmin with explicit actor_type — honour it (allows 'user' or 'superadmin' filter)
    if (actor_type && actor_type !== "") {
      const response = await promisifyGRPC(
        logClient.QueryLogs.bind(logClient),
        {
          ...grpcBase,
          actor_type,
          actor_id: actor_id || "",
        },
      );
      return res.json(response);
    }

    // superadmin with no actor_type filter: merge user + superadmin, exclude clients
    const [userRes, superadminRes] = await Promise.all([
      promisifyGRPC(logClient.QueryLogs.bind(logClient), {
        ...grpcBase,
        actor_type: "user",
        actor_id: actor_id || "",
      }),
      promisifyGRPC(logClient.QueryLogs.bind(logClient), {
        ...grpcBase,
        actor_type: "superadmin",
        actor_id: actor_id || "",
      }),
    ]);

    const merged = [...(userRes.logs || []), ...(superadminRes.logs || [])]
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
      .slice(0, safeLimit);

    return res.json({
      logs: merged,
      total: (userRes.total || 0) + (superadminRes.total || 0),
    });
  } catch (error) {
    console.error("Error fetching all logs:", error.message);
    return res.status(500).json({
      error: "Failed to fetch logs",
      message: error.message,
    });
  }
});

// GET /logs/clients
// All client action logs, accessible to both user and superadmin roles.
router.get(
  "/clients",
  validateJWT(["user", "superadmin"]),
  async (req, res) => {
    try {
      const { actor_id, from, to, page = 1, limit = 50 } = req.query;

      const response = await promisifyGRPC(
        logClient.QueryLogs.bind(logClient),
        {
          actor_type: "client",
          actor_id: actor_id || "",
          action: "",
          from: from ? Number.parseInt(from, 10) : 0,
          to: to ? Number.parseInt(to, 10) : 0,
          page: Number.parseInt(page, 10) || 1,
          limit: Math.min(Number.parseInt(limit, 10) || 50, 100),
        },
      );

      return res.json(response);
    } catch (error) {
      console.error("Error fetching client logs:", error.message);
      return res.status(500).json({
        error: "Failed to fetch client logs",
        message: error.message,
      });
    }
  },
);

// GET /logs/payments
// Back-office: superadmin sees all clients' payment logs; user sees only their assigned clients.
// Optional query params: actor_id, from, to, page, limit
router.get(
  "/payments",
  validateJWT(["user", "superadmin"]),
  async (req, res) => {
    try {
      const { actor_id, from, to, page = 1, limit = 50 } = req.query;

      const response = await promisifyGRPC(
        logClient.QueryLogs.bind(logClient),
        {
          actor_type: "client",
          actor_id: actor_id || "",
          action: "PAYMENT%",
          from: from ? Number.parseInt(from, 10) : 0,
          to: to ? Number.parseInt(to, 10) : 0,
          page: Number.parseInt(page, 10) || 1,
          limit: Math.min(Number.parseInt(limit, 10) || 50, 100),
        },
      );

      return res.json(response);
    } catch (error) {
      console.error("Error fetching payment logs:", error.message);
      return res.status(500).json({
        error: "Failed to fetch payment logs",
        message: error.message,
      });
    }
  },
);

// GET /logs/accounts
// Account operation logs (CREATE_ACCOUNT, DELETE_ACCOUNT, UPDATE_ACCOUNT_STATUS)
router.get(
  "/accounts",
  validateJWT(["user", "superadmin"]),
  async (req, res) => {
    try {
      const { actor_email, action, from, to, page = 1, limit = 50 } = req.query;

      const response = await promisifyGRPC(
        logClient.QueryLogs.bind(logClient),
        {
          actor_type: "account",
          actor_email: actor_email || "",
          action: action || "",
          from: from ? Number.parseInt(from, 10) : 0,
          to: to ? Number.parseInt(to, 10) : 0,
          page: Number.parseInt(page, 10) || 1,
          limit: Math.min(Number.parseInt(limit, 10) || 50, 100),
        },
      );

      return res.json(response);
    } catch (error) {
      console.error("Error fetching account logs:", error.message);
      return res.status(500).json({
        error: "Failed to fetch account logs",
        message: error.message,
      });
    }
  },
);

module.exports = router;
