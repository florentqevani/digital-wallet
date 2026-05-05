// src/server.js - Express HTTP server with gRPC passthrough

const express = require('express');
const cors = require('cors');
const config = require('./config');

// Import middleware
const { requestLogger } = require('./middleware/logger');
const { apiLimiter } = require('./middleware/rate-limiter');

// Import routes
const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const logsRoutes = require('./routes/logs');
const usersRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');
const currencyRoutes = require('./routes/add-currency');
const balanceRoutes = require('./routes/set-balance');
const clientBalanceRoutes = require('./routes/balance');
const paymentRoutes = require('./routes/payments');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(requestLogger);
app.use(apiLimiter); // General rate limiter for all routes

// Health check (before other routes)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// API routes
app.use('/auth', authRoutes);
app.use('/clients', clientsRoutes);
app.use('/logs', logsRoutes);
app.use('/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/add-currency', currencyRoutes);
app.use('/api/set-balance', balanceRoutes);
app.use('/api/balance', clientBalanceRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err.message);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// Start server
const server = app.listen(config.port, () => {
    console.log(`\n🚀 API Gateway listening on port ${config.port}`);
    console.log(`   HTTP: http://localhost:${config.port}`);
    console.log(`   Health: http://localhost:${config.port}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server shut down');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server shut down');
        process.exit(0);
    });
});