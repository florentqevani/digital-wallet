// src/utils/promise-wrapper.js - Convert gRPC callbacks to promises

/**
 * Wraps gRPC callback-based calls into promises
 * Makes it easier to use async/await in Express handlers
 */

function promisifyGRPC(grpcCall, request) {
    return new Promise((resolve, reject) => {
        grpcCall(request, (err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
    });
}

module.exports = { promisifyGRPC };