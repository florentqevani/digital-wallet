# Web BFF

> Part of the [GRPC App](../README.md) platform.

The Web Backend-for-Frontend (BFF) is the HTTP server that sits between the React back-office and the API Gateway. It applies JWT verification locally and adds web-specific request shaping.

---

## Responsibilities

- Receive HTTP requests from the React web-frontend
- Verify JWTs locally (no extra round-trip)
- Proxy requests to the API Gateway over HTTP
- Shape responses for the web client

---

## Port

| Context | Port |
|---|---|
| Host (docker-compose) | `3104` |
| Internal Docker network | `3004` |

---

## Routes

| Method | Path | Forwards to |
|---|---|---|
| POST | `/api/auth/login` | `API_GATEWAY_URL/api/auth/login` |
| POST | `/api/auth/register-user` | `API_GATEWAY_URL/api/auth/register-user` |
| GET | `/api/users` | `API_GATEWAY_URL/api/users` |
| PUT | `/api/users/:id` | `API_GATEWAY_URL/api/users/:id` |
| DELETE | `/api/users/:id` | `API_GATEWAY_URL/api/users/:id` |
| GET | `/api/clients` | `API_GATEWAY_URL/api/clients` |
| PUT | `/api/clients/:id` | `API_GATEWAY_URL/api/clients/:id` |
| DELETE | `/api/clients/:id` | `API_GATEWAY_URL/api/clients/:id` |
| GET/POST | `/api/accounts` | `API_GATEWAY_URL/api/accounts` |
| GET | `/api/logs` | `API_GATEWAY_URL/api/logs` |
| GET | `/api/logs/dashboard` | `API_GATEWAY_URL/api/logs/dashboard` |
| POST | `/api/add-currency` | `API_GATEWAY_URL/api/add-currency` |
| POST | `/api/set-balance` | `API_GATEWAY_URL/api/set-balance` |
| GET | `/health` | local health response |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP listen port | `3001` |
| `API_GATEWAY_URL` | Base URL of the API Gateway | `http://api-gateway:8080` |
| `AUTH_SERVICE_URL` | Auth service gRPC address (for direct calls if needed) | `localhost:50051` |
| `JWT_SECRET` | Shared JWT signing secret (local verification) | — |

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

Response:
```json
{
  "token": "eyJhbGc...",
  "role": "superadmin",
  "success": true,
  "message": "Logged in successfully"
}
```

#### GET /api/logs/my-logs
Get logs for the current user only (requires JWT).

Query params:
- `page` (default: 1)
- `limit` (default: 20, max: 100)

Response:
```json
{
  "logs": [
    {
      "id": "log1",
      "actor_id": "user123",
      "actor_type": "user",
      "action": "LOGIN",
      "status": "SUCCESS",
      "message": "...",
      "timestamp": 1704067200000
    }
  ],
  "total": 42
}
```

#### GET /api/logs/dashboard
Super-admin dashboard with summary (requires super-admin role).

Response:
```json
{
  "clientLogs": [...],
  "userLogs": [...],
  "summary": {
    "totalClientLogs": 45,
    "totalUserLogs": 32,
    "errorCount": 3,
    "successCount": 74
  }
}
```

#### GET /api/logs/all
All logs with optional filtering (requires super-admin role).

Query params:
- `actor_type` ("client" | "user" | "")
- `actor_id` (filter by user/client)
- `from` (Unix ms start)
- `to` (Unix ms end)
- `page` (default: 1)
- `limit` (default: 50, max: 100)

#### GET /health
Health check.

Response:
```json
{ "status": "ok" }
```

## Local Development

### Setup

```bash
npm install
cp .env.example .env
# Edit .env with service URLs
```

### Run

```bash
npm start
# Or with auto-reload:
npm run dev
```

### With Docker Compose

```bash
docker-compose up web-bff
```

