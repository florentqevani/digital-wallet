# User Service

> Part of the [GRPC App](../README.md) platform.

gRPC microservice responsible for managing back-office users and mobile clients. It is the source of truth for user profiles, roles, balances, and currency settings.

---

## Responsibilities

- CRUD operations on back-office **users** (superadmin-only)
- CRUD operations on mobile **clients**
- Currency and balance management per client account
- Publish audit events to the `service-logs` queue after mutations

---

## gRPC Port

| Context | Port |
|---|---|
| Internal Docker network | `50053` |
| Health HTTP (host) | `15053` |

---

## RPC Methods (`user.proto`)

### User Management (back-office users)

| Method | Description | Caller role |
|---|---|---|
| `ListUsers` | Return all back-office users | superadmin |
| `RegisterUser` | Create a back-office user | superadmin |
| `UpdateUser` | Update email / name / role / password | superadmin |
| `DeleteUser` | Remove a back-office user | superadmin |

### Client Management (mobile users)

| Method | Description |
|---|---|
| `ListClients` | Return all clients with balance and currency |
| `UpdateClient` | Update email / name / password for a client |
| `DeleteClient` | Remove a client |

### Account / Balance

| Method | Description |
|---|---|
| `SetCurrency` | Set the currency for a client account |
| `SetBalance` | Overwrite the balance for a client account |
| `AddBalance` | Increment the balance (called after payment confirmation) |
| `GetClientBalance` | Return current balance and currency |

---

## Database

Shares `auth_db` with Auth Service and Account Service.

| Table | Operations |
|---|---|
| `users` | SELECT, INSERT, UPDATE, DELETE |
| `clients` | SELECT, UPDATE, DELETE (accounts joined) |

---

## RabbitMQ

Publishes audit events to:

| Queue | Purpose |
|---|---|
| `service-logs` | Consumed by Log Service to write audit records |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | gRPC listen port | `50053` |
| `HEALTH_PORT` | HTTP health port | `15053` |
| `AUTH_DB_URL` | PostgreSQL connection string for `auth_db` | — |
| `LOG_SERVICE_URL` | Log service gRPC address | `localhost:50052` |
| `RABBITMQ_URL` | RabbitMQ connection string | — |

---

## Local Development

```bash
cd user-service
npm install
cp .env.example .env
# Edit .env — set AUTH_DB_URL and RABBITMQ_URL
npm start
```

With Docker Compose (recommended):

```bash
docker compose up user-service
```

---

## Health Check

```
GET http://localhost:15053/health
```

Returns `{ "status": "ok", "service": "user-service" }`.
