# Log Service

gRPC microservice for audit logging across all MyApp services.

## What It Does

- **WriteLog** — Write a log entry via gRPC (called directly by API Gateway)
- **QueryLogs** — Query logs with filtering by actor, date range, pagination
- **RabbitMQ consumer** — Subscribes to the `service-logs` queue and writes messages to PostgreSQL; auto-reconnects on broker restarts

## Local Development

### Setup

```bash
npm install
cp .env.example .env
# Edit .env with your database URL
```

### Run

```bash
npm start
# Or with auto-reload:
npm run dev
```

### With Docker Compose

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