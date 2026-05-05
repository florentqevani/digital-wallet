# Log Service

> Part of the [GRPC App](../README.md) platform.

gRPC microservice that is the centralised audit log for the entire platform. It accepts log writes both directly over gRPC and asynchronously via RabbitMQ.

---

## Responsibilities

- Persist structured audit entries to `log_db`
- Accept writes via gRPC (`WriteLog`) for direct callers
- Consume the `service-logs` RabbitMQ queue for fire-and-forget writes from Auth Service, User Service, and Payment Service
- Expose a filterable query interface (`QueryLogs`) used by the API Gateway dashboard and log endpoints
- Auto-reconnect to RabbitMQ on broker restart

---

## gRPC Port

| Context | Port |
|---|---|
| Internal Docker network | `50052` |
| Health HTTP (host) | `15052` |

---

## RPC Methods (`log.proto`)

| Method | Description |
|---|---|
| `WriteLog` | Insert a single log entry directly |
| `QueryLogs` | Query logs with filters: actor type, actor ID, date range, action prefix, pagination |

### `LogRequest` fields

| Field | Description |
|---|---|
| `actor_id` | ID of the user or client performing the action |
| `actor_type` | `"client"`, `"user"`, or `"superadmin"` |
| `action` | Action name, e.g. `"LOGIN"`, `"REGISTER"`, `"PAYMENT_COMPLETED"` |
| `status` | `"SUCCESS"` or `"ERROR"` |
| `message` | Optional detail string |
| `timestamp` | Unix milliseconds (auto-set if omitted) |

---

## RabbitMQ Consumer

Listens on the `service-logs` queue (durable). Handles reconnection automatically with a 5-second retry loop.

Each message must be a JSON object with the same fields as `LogRequest`. Invalid or incomplete messages are discarded (nack, no requeue).

---

## Database

PostgreSQL database: `log_db`

| Table | Description |
|---|---|
| `logs` | All audit entries with indexes on `actor_type`, `actor_id`, `created_at`, and `action` |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | gRPC listen port | `50052` |
| `HEALTH_PORT` | HTTP health port | `15052` |
| `LOG_DB_URL` | PostgreSQL connection string for `log_db` | — |
| `RABBITMQ_URL` | RabbitMQ connection string | — |

---

## Local Development

```bash
cd log-service
npm install
cp .env.example .env
# Edit .env — set LOG_DB_URL and RABBITMQ_URL
npm start
```

With Docker Compose (recommended):

```bash
docker compose up log-service
```

---

## Health Check

```
GET http://localhost:15052/health
```

Returns `{ "status": "ok", "service": "log-service" }`.

```bash
docker-compose up log-service
```

## Database

Uses PostgreSQL. Table:
- `logs` — audit log entries with actor_id, actor_type, action, status, message, timestamp

## API (gRPC)

### WriteLog

Write a single log entry (fire-and-forget).

Request:
```proto
message LogRequest {
  string actor_id   = 1;  // who did this? (user_id or client_id)
  string actor_type = 2;  // "client", "user", or "superadmin"
  string action     = 3;  // what did they do? (LOGIN, REGISTER, etc)
  string status     = 4;  // "SUCCESS" or "ERROR"
  string message    = 5;  // optional detail
  int64  timestamp  = 6;  // Unix milliseconds
}
```

Response:
```proto
message LogResponse {
  bool saved = 1;  // true if written, false if error
}
```

### QueryLogs

Query logs with filtering and pagination.

Request:
```proto
message LogQuery {
  string actor_type = 1;  // filter by type (optional, "" means all)
  string actor_id   = 2;  // filter by actor (optional)
  int64  from       = 3;  // date range start (Unix ms, optional)
  int64  to         = 4;  // date range end (Unix ms, optional)
  int32  page       = 5;  // page number (1-based)
  int32  limit      = 6;  // results per page (max 1000)
}
```

Response:
```proto
message LogListResponse {
  repeated LogEntry logs = 1;  // matching logs
  int32             total = 2;  // total count (for pagination UI)
}
```

## Configuration

See `.env.example` for all available options.

| Variable | Description | Default |
|---|---|---|
| `PORT` | gRPC listen port | `50052` |
| `HEALTH_PORT` | HTTP health endpoint port | `15052` |
| `LOG_DB_URL` | PostgreSQL connection string | required |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://app:secret@rabbitmq:5672` |

## Dependencies

- `@grpc/grpc-js` — gRPC server
- `amqplib` — RabbitMQ consumer
- `pg` — PostgreSQL driver
- `dotenv` — environment variable management