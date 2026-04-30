// src/middleware/logger.js - Request/response logging middleware

/**
 * Logs all incoming requests with method, path, and status
 */
function requestLogger(req, res, next) {
    const start = Date.now();

    // Capture the original res.json to log response
    const originalJson = res.json;
    res.json = function (data) {
        const duration = Date.now() - start;
        console.log(
            `${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`
        );
        return originalJson.call(this, data);
    };

    next();
}

module.exports = { requestLogger };