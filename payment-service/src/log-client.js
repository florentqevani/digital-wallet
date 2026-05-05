'use strict';

// Fire-and-forget gRPC log writer — mirrors user-service/src/log-queue.js

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('./config');

const protoPath = path.join(
    __dirname,
    '../node_modules/@myapp/proto-contracts/proto/log.proto'
);

const packageDef = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const { log } = grpc.loadPackageDefinition(packageDef);

const logClient = new log.LogService(
    config.logServiceUrl,
    grpc.credentials.createInsecure()
);

const MAX_RETRIES = 20;
const RETRY_INTERVAL_MS = 5000;
const MAX_SIZE = 500;

let _queue = [];
let _timer = null;

function _attempt(payload) {
    return new Promise((resolve, reject) => {
        logClient.WriteLog(payload, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function _drain() {
    if (_queue.length === 0) {
        clearInterval(_timer);
        _timer = null;
        return;
    }
    const pending = _queue.splice(0);
    for (const item of pending) {
        try {
            await _attempt(item.payload);
        } catch {
            item.retries += 1;
            if (item.retries < MAX_RETRIES) {
                _queue.push(item);
            } else {
                console.error(`[PaymentLogQueue] Dropping entry after ${MAX_RETRIES} retries:`, item.payload.action);
            }
        }
    }
}

function _schedule() {
    if (_timer) return;
    _timer = setInterval(_drain, RETRY_INTERVAL_MS);
}

/**
 * Write a payment log entry (fire-and-forget with in-memory retry).
 * @param {object} payload - { actor_id, actor_type, action, status, message }
 */
function writeLog(payload) {
    const entry = { ...payload, timestamp: Date.now() };
    _attempt(entry).catch(() => {
        if (_queue.length >= MAX_SIZE) {
            console.warn('[PaymentLogQueue] Queue full, dropping:', payload.action);
            return;
        }
        _queue.push({ payload: entry, retries: 0 });
        _schedule();
        console.warn(`[PaymentLogQueue] Log-service unavailable — queued (${_queue.length} pending): ${payload.action}`);
    });
}

module.exports = { writeLog };
