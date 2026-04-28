# Mobile BFF

Backend for Frontend serving the Flutter mobile app.

## What It Does

Translates HTTP requests from Flutter into gRPC calls to microservices.

### Endpoints

#### POST /api/auth/register
Register a new client.

Request:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

Response:
```json
{
  "token": "eyJhbGc...",
  "role": "client",
  "success": true,
  "message": "Registered successfully"
}
```

#### POST /api/auth/login
Login and get recent activity in one request (aggregation example).

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGc...",
  "role": "client",
  "success": true,
  "recentActivity": [
    {
      "id": "log1",
      "actor_id": "client123",
      "action": "LOGIN",
      "status": "SUCCESS",
      "timestamp": 1704067200000
    }
  ]
}
```

#### GET /health
Health check endpoint.

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
docker-compose up mobile-bff
```

## Architecture

