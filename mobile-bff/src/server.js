// src/server.js - Express HTTP server

const express = require('express');
const cors = require('cors');
const config = require('./config');

// Import routes
const authRoutes = require('./routes/auth');
const logsRoutes = require('./routes/logs');
const healthRoutes = require('./routes/health');
const balanceRoutes = require('./routes/balance');
const paymentsRoutes = require('./routes/payments');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Health check endpoint (usually first)
app.use('/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/payments', paymentsRoutes);

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
    console.log(`\n🚀 Mobile BFF listening on port ${config.port}`);
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