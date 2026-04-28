// src/log-queue.js - Retry queue for fire-and-forget log writes
//
// When log-service is unavailable, log entries are buffered in memory and
// flushed automatically every RETRY_INTERVAL_MS once the service recovers.
// Items are retried up to MAX_RETRIES times before being dropped.

const { logClient } = require('./grpc-clients');

const MAX_RETRIES = 20;   // ~100 seconds of retries at 5s interval
const RETRY_INTERVAL_MS = 5000;
const MAX_SIZE = 500;  // prevent unbounded growth

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
                console.error(`[LogQueue] Dropping log entry after ${MAX_RETRIES} retries:`, item.payload.action);
            }
        }
    }
}

function _schedule() {
    if (_timer) return;
    _timer = setInterval(_drain, RETRY_INTERVAL_MS);
}

/**
 * Write a log entry. Attempts immediately; on failure, buffers and retries
 * in the background until log-service is reachable again.
 *
 * @param {object} payload - Log proto fields (actor_id, actor_type, action, status, message, timestamp)
 */
function writeLog(payload) {
    _attempt(payload).catch(() => {
        if (_queue.length >= MAX_SIZE) {
            console.warn('[LogQueue] Queue full, dropping log entry:', payload.action);
            return;
        }
        _queue.push({ payload, retries: 0 });
        _schedule();
        console.warn(`[LogQueue] Log-service unavailable — queued (${_queue.length} pending): ${payload.action}`);
    });
}

module.exports = { writeLog };
