// src/server.js - Express HTTP server

const express = require('express');
const cors = require('cors');
const config = require('./config');

// Import routes
const authRoutes = require('./routes/auth');
const accountsRoutes = require('./routes/accounts');
const clientsRoutes = require('./routes/clients');
const logsRoutes = require('./routes/logs');
const usersRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');
const currencyRoutes = require('./routes/add-currency');
const balanceRoutes = require('./routes/set-balance');

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
app.use('/api/accounts', accountsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/add-currency', currencyRoutes);
app.use('/api/set-balance', balanceRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// Start server
const server = app.listen(config.port, () => {
    console.log(`   Web BFF listening on port ${config.port}`);
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

