// src/utils/promise-wrapper.js - Convert gRPC callbacks to promises

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