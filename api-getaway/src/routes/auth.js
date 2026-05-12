// src/routes/auth.js - Authentication passthrough routes

const express = require("express");
const { authClient, userClient } = require("../grpc-clients");
const { authLimiter } = require("../middleware/rate-limiter");
const { promisifyGRPC } = require("../utils/promise-wrapper");
const { validateJWT } = require("../middleware/jwt-validator");

const router = express.Router();

// ── POST /auth/register
/**
 * Register client endpoint
 * Gateway simply passes through to Auth Service
 */
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    console.log(`📝 Register request: ${email}`);

    const response = await promisifyGRPC(
      authClient.RegisterClient.bind(authClient),
      {
        email,
        password,
        name: name || "",
      },
    );

    res.json(response);
  } catch (error) {
    console.error("❌ Register error:", error.message);
    res.status(error.httpStatus || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// ── POST /auth/login-client
/**
 * Login client endpoint
 * Gateway applies rate limiting and passes through to Auth Service
 */
router.post("/login-client", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    console.log(`🔐 Client login request: ${email}`);

    const response = await promisifyGRPC(
      authClient.LoginClient.bind(authClient),
      {
        email,
        password,
      },
    );

    res.json(response);
  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(error.httpStatus || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// ── POST /auth/login-user
/**
 * Login user endpoint (back-office)
 * Gateway applies rate limiting and passes through to Auth Service
 */
router.post("/login-user", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    console.log(`🔐 User login request: ${email}`);

    const response = await promisifyGRPC(
      authClient.LoginUser.bind(authClient),
      {
        email,
        password,
      },
    );

    res.json(response);
  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(error.httpStatus || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// ── POST /auth/login
/**
 * Web-frontend compatible login endpoint
 */
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    console.log(`🔐 User login request: ${email}`);

    const response = await promisifyGRPC(
      authClient.LoginUser.bind(authClient),
      {
        email,
        password,
      },
    );

    res.json(response);
  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(error.httpStatus || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// ── POST /auth/register-user
router.post("/register-user", validateJWT(["superadmin"]), async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const response = await promisifyGRPC(
      userClient.RegisterUser.bind(userClient),
      {
        email,
        password,
        name: name || "",
        role: role || "user",
        created_by: req.user.user_id,
      },
    );

    res.json(response);
  } catch (error) {
    console.error("❌ Register user error:", error.message);
    res.status(error.httpStatus || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// ── GET /auth/users
router.get("/users", validateJWT(["superadmin"]), async (req, res) => {
  try {
    const response = await promisifyGRPC(
      userClient.ListUsers.bind(userClient),
      {},
    );
    res.json(response);
  } catch (error) {
    console.error("❌ List users error:", error.message);
    res.status(error.httpStatus || 500).json({
      users: [],
      message: error.message,
    });
  }
});

// ── POST /auth/validate
/**
 * Validate JWT token endpoint
 * Useful for third-party services to validate tokens
 */
router.post("/validate", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        valid: false,
        message: "Token is required",
      });
    }

    const response = await promisifyGRPC(
      authClient.ValidateToken.bind(authClient),
      {
        token,
      },
    );

    res.json(response);
  } catch (error) {
    console.error("❌ Validate error:", error.message);
    res.status(error.httpStatus || 500).json({
      valid: false,
      message: error.message,
    });
  }
});

module.exports = router;
