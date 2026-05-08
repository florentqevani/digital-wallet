# Mobile BFF

> Part of the [GRPC App](../README.md) platform.

The Mobile Backend-for-Frontend (BFF) is the HTTP server that sits between the Flutter app and the API Gateway. It handles mobile-specific concerns: aggregated login responses and payment proxying.

---

## Responsibilities

- Receive HTTP requests from the Flutter mobile app
- Proxy auth and log requests to the API Gateway
- Aggregate login: authenticate and fetch recent activity in a single response, eliminating an extra round-trip from the app
- Proxy payment routes (transfer by email, balance, history) to the API Gateway

---

## Port

| Context                 | Port   |
| ----------------------- | ------ |
| Host (docker-compose)   | `3002` |
| Internal Docker network | `3002` |

---

## Routes

| Method | Path                     | Description                                            |
| ------ | ------------------------ | ------------------------------------------------------ |
| POST   | `/api/auth/register`     | Register a new client → JWT                            |
| POST   | `/api/auth/login`        | Login client + fetch recent activity → merged response |
| GET    | `/api/logs`              | Query audit logs for the authenticated client          |
| POST   | `/api/payments/transfer` | Send funds to another client by email                  |
| GET    | `/api/payments/balance`  | Get client's current wallet balance                    |
| GET    | `/api/payments/history`  | Get client's paginated transaction history             |
| GET    | `/health`                | Health check                                           |

---

## Aggregated Login

On `POST /api/auth/login` the BFF:

1. Calls `API Gateway /api/auth/login-client`
2. On success, calls `API Gateway /api/logs` for the last 5 actions of that client
3. Returns a single merged payload:

```json
{
  "token": "...",
  "role": "client",
  "success": true,
  "message": "Login successful",
  "recentActivity": [ ... ]
}
```

This eliminates a separate log fetch on app startup.

---

## Environment Variables

| Variable          | Description                 | Default                   |
| ----------------- | --------------------------- | ------------------------- |
| `PORT`            | HTTP listen port            | `3002`                    |
| `API_GATEWAY_URL` | Base URL of the API Gateway | `http://api-gateway:8080` |

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
