# Mobile BFF

> Part of the [GRPC App](../README.md) platform.

The Mobile Backend-for-Frontend (BFF) is the HTTP server that sits between the Flutter app and the API Gateway. It handles mobile-specific concerns: aggregated login responses, payment callback URL construction, and WebView-based payment flow support.

---

## Responsibilities

- Receive HTTP requests from the Flutter mobile app
- Proxy auth and log requests to the API Gateway
- Aggregate login: authenticate + fetch recent activity in a single response
- Build RaiAccept callback URLs and webhook URL before forwarding payment requests
- Support server-side RaiAccept webhook notifications

---

## Port

| Context | Port |
|---|---|
| Host (docker-compose) | `3002` |
| Internal Docker network | `3002` |

---

## Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new client → JWT |
| POST | `/api/auth/login` | Login client + fetch recent activity → merged response |
| GET | `/api/logs` | Query audit logs for the authenticated client |
| GET | `/api/balance` | Get client account balance |
| POST | `/api/payments/initiate` | Build callback URLs then call `API Gateway /api/payments/initiate` |
| POST | `/api/payments/confirm` | Forward to `API Gateway /api/payments/confirm` |
| POST | `/api/payments/webhook` | Receive RaiAccept server-to-server payment notifications |
| GET | `/health` | Health check |

---

## Aggregated Login

On `POST /api/auth/login` the BFF:

1. Calls `API Gateway /api/auth/login-client`
2. On success, calls `API Gateway /api/logs` for the last 5 actions of that client
3. Returns a merged payload:

```json
{
  "token": "...",
  "role": "client",
  "success": true,
  "message": "Login successful",
  "recentActivity": [ ... ]
}
```

---

## Payment Callback URL Construction

Before calling the gateway to initiate a payment, the BFF injects:

- `success_url` → `{RAIACCEPT_MOBILE_CALLBACK_BASE}/success`
- `fail_url` → `{RAIACCEPT_MOBILE_CALLBACK_BASE}/fail`
- `cancel_url` → `{RAIACCEPT_MOBILE_CALLBACK_BASE}/cancel`
- `notification_url` → `{RAIACCEPT_WEBHOOK_URL}/api/payments/webhook`

The Flutter WebView uses a `NavigationDelegate` to intercept these fake-host URLs and close the WebView once payment completes.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP listen port | `3002` |
| `API_GATEWAY_URL` | Base URL of the API Gateway | `http://api-gateway:8080` |
| `AUTH_SERVICE_URL` | Auth service gRPC address | — |
| `LOG_SERVICE_URL` | Log service gRPC address | — |
| `RAIACCEPT_WEBHOOK_URL` | Public URL for RaiAccept server notifications | `http://localhost:3002` |
| `RAIACCEPT_MOBILE_CALLBACK_BASE` | Base URL intercepted by Flutter WebView | `http://mobile.callback` |

---

## Local Development

```bash
cd mobile-bff
npm install
cp .env.example .env
# Edit .env — set API_GATEWAY_URL
npm start
```

With Docker Compose (recommended):

```bash
docker compose up mobile-bff
```

---

## Health Check

```
GET http://localhost:3002/health
```

Returns `{ "status": "ok" }`.