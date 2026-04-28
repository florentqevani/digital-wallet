# Web BFF

Backend for Frontend serving the back-office web application (React, Vue, etc).

## What It Does

Translates HTTP requests from the back-office web app into gRPC calls to microservices.

### Endpoints

#### POST /api/auth/login
Login a back-office user (user or super-admin).

Request:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

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

## Architecture