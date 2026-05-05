# Auth Service

> Part of the [GRPC App](../README.md) platform.

gRPC microservice for authentication and token management. All other services trust the JWTs issued here.

---

## Responsibilities

- Issue signed JWTs on successful login or registration
- Embed `role` and `permissions[]` claims inside every token so downstream services can authorise without an extra lookup
- Verify and decode tokens on demand (`ValidateToken`)
- Publish audit events fire-and-forget to two RabbitMQ queues after registration/login

---

## gRPC Port

| Context | Port |
|---|---|
| Internal Docker network | `50051` |
| Health HTTP (host) | `15051` |

---

## RPC Methods (`auth.proto`)

| Method | Description |
|---|---|
| `RegisterClient` | Register a new mobile app user → returns JWT |
| `LoginClient` | Authenticate a mobile app user → returns JWT |
| `LoginUser` | Authenticate a back-office user (role: `user` or `superadmin`) → returns JWT |
| `ValidateToken` | Verify a JWT, return `user_id`, `role`, `permissions` |
| `CreateToken` | Sign and issue a JWT for a given `user_id` + `role` (internal use) |

---

## Database

PostgreSQL database: `auth_db`

| Table | Purpose |
|---|---|
| `clients` | Mobile app users (email, password hash, name) |
| `users` | Back-office users (email, password hash, role: `user` / `superadmin`) |

---

## RabbitMQ

After a client registers, two messages are published:

| Queue | Consumer | Purpose |
|---|---|---|
| `service-logs` | Log Service | Writes an audit entry for the registration event |
| `client-registered` | Account Service | Triggers account provisioning for the new client |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | gRPC listen port | `50051` |
| `HEALTH_PORT` | HTTP health port | `15051` |
| `AUTH_DB_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Signing secret (shared with API Gateway / BFFs) | — |
| `JWT_EXPIRY` | Token lifetime | `7d` |
| `LOG_SERVICE_URL` | Log service gRPC address | `localhost:50052` |
| `RABBITMQ_URL` | RabbitMQ connection string | — |

---

## Local Development

```bash
cd auth_service
npm install
cp .env.example .env
# Edit .env — set AUTH_DB_URL and JWT_SECRET
npm start
```

With Docker Compose (recommended):

```bash
docker compose up auth-service
```

---

## Health Check

```
GET http://localhost:15051/health
```

Returns `{ "status": "ok", "service": "auth-service" }`.

## Dependencies

- `@grpc/grpc-js` — gRPC server
- `bcrypt` — password hashing
- `jsonwebtoken` — JWT token creation/validation
- `amqplib` — RabbitMQ publisher (audit log events)
- `pg` — PostgreSQL driver
- `dotenv` — environment variable management