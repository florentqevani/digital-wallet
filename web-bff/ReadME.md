# Web BFF

> Part of the [GRPC App](../README.md) platform.

The Web Backend-for-Frontend (BFF) is the HTTP server that sits between the React back-office SPA and the API Gateway. It is the only endpoint the React app ever contacts — it applies JWT verification locally and forwards every request to the Gateway.

---

## Responsibilities

- Receive HTTP requests from the React web-frontend
- Verify the JWT locally on every authenticated route using `JWT_SECRET` — no round-trip to Auth Service
- Proxy all requests to the API Gateway over plain HTTP
- Shape error responses for the web client
- Handle CORS for browser-originated requests

---

## Port

| Context                 | Port   |
| ----------------------- | ------ |
| Host (docker-compose)   | `3104` |
| Internal Docker network | `3004` |

---

## Routes

| Method | Path                               | Forwards to Gateway                |
| ------ | ---------------------------------- | ---------------------------------- |
| POST   | `/api/auth/login`                  | `/api/auth/login`                  |
| POST   | `/api/auth/register-user`          | `/api/auth/register-user`          |
| GET    | `/api/users`                       | `/api/users`                       |
| PUT    | `/api/users/:id`                   | `/api/users/:id`                   |
| DELETE | `/api/users/:id`                   | `/api/users/:id`                   |
| GET    | `/api/clients`                     | `/api/clients`                     |
| PUT    | `/api/clients/:id`                 | `/api/clients/:id`                 |
| DELETE | `/api/clients/:id`                 | `/api/clients/:id`                 |
| GET    | `/api/accounts`                    | `/api/accounts`                    |
| POST   | `/api/accounts`                    | `/api/accounts`                    |
| DELETE | `/api/accounts/:account_id`        | `/api/accounts/:account_id`        |
| PATCH  | `/api/accounts/:account_id/status` | `/api/accounts/:account_id/status` |
| GET    | `/api/logs/my-logs`                | `/api/logs/my-logs`                |
| GET    | `/api/logs/dashboard`              | `/api/logs/dashboard`              |
| GET    | `/api/logs/all`                    | `/api/logs/all`                    |
| GET    | `/api/logs/clients`                | `/api/logs/clients`                |
| GET    | `/api/logs/payments`               | `/api/logs/payments`               |
| GET    | `/api/logs/accounts`               | `/api/logs/accounts`               |
| POST   | `/api/payments/topup`              | `/api/payments/topup`              |
| POST   | `/api/payments/transfer`           | `/api/payments/transfer`           |
| GET    | `/api/payments/balance`            | `/api/payments/balance`            |
| GET    | `/api/payments/history`            | `/api/payments/history`            |
| GET    | `/health`                          | Local response                     |

---

## Environment Variables

| Variable          | Description                                    | Default                   |
| ----------------- | ---------------------------------------------- | ------------------------- |
| `PORT`            | HTTP listen port                               | `3004`                    |
| `API_GATEWAY_URL` | Base URL of the API Gateway                    | `http://api-gateway:8080` |
| `JWT_SECRET`      | Shared JWT signing secret (local verification) | —                         |

---

## Local Development

```bash
cd web-bff
npm install
cp .env.example .env
# Edit .env — set API_GATEWAY_URL and JWT_SECRET
npm start
```

With Docker Compose (recommended):

```bash
docker compose up web-bff
```

---

## Health Check

```
GET http://localhost:3104/health
```

Returns `{ "status": "ok" }`.
