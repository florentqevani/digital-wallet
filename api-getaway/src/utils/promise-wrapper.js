// src/utils/promise-wrapper.js - Convert gRPC callbacks to promises

// Maps gRPC status codes to { httpStatus, message }
const GRPC_STATUS_MAP = {
  1: { httpStatus: 499, message: "Request cancelled" },
  2: { httpStatus: 500, message: "Unknown error" },
  3: { httpStatus: 400, message: "Invalid argument" },
  4: { httpStatus: 504, message: "Request timed out" },
  5: { httpStatus: 404, message: "Not found" },
  6: { httpStatus: 409, message: "Already exists" },
  7: { httpStatus: 403, message: "Permission denied" },
  8: { httpStatus: 429, message: "Resource exhausted" },
  9: { httpStatus: 400, message: "Failed precondition" },
  10: { httpStatus: 409, message: "Aborted" },
  11: { httpStatus: 400, message: "Out of range" },
  12: { httpStatus: 501, message: "Not implemented" },
  13: { httpStatus: 500, message: "Internal error" },
  14: { httpStatus: 503, message: "Service temporarily unavailable" },
  15: { httpStatus: 500, message: "Data loss" },
  16: { httpStatus: 401, message: "Unauthenticated" },
};

function normalizeGrpcError(err) {
  const mapped = GRPC_STATUS_MAP[err.code];
  const normalized = new Error(
    mapped ? mapped.message : err.details || err.message,
  );
  normalized.httpStatus = mapped ? mapped.httpStatus : 500;
  normalized.grpcCode = err.code;
  return normalized;
}

function promisifyGRPC(grpcCall, request) {
  return new Promise((resolve, reject) => {
    grpcCall(request, (err, response) => {
      if (err) {
        reject(normalizeGrpcError(err));
      } else {
        resolve(response);
      }
    });
  });
}

module.exports = { promisifyGRPC };
