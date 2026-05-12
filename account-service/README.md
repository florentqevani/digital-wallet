# Account Service

> Part of the [GRPC App](../README.md) platform.

Hybrid service that exposes a gRPC interface (`ListAccounts`) and processes account lifecycle events from two RabbitMQ queues.

---

## Responsibilities

- Expose `ListAccounts` over gRPC (reads from `accounts` table)
- Consume the `client-registered` queue — assigns a UUID `account_id` to newly registered clients
- Consume the `account-events` queue — handles `CREATE_ACCOUNT`, `DELETE_ACCOUNT`, and `UPDATE_ACCOUNT_STATUS` operations published by the API Gateway
- Automatically reconnect to RabbitMQ on connection loss

---

## How It Fits In

```
Auth Service
  └─► publishes to [client-registered] queue
            │
            ▼
     Account Service (consumer)
            │
            ▼
    UPDATE clients SET account_id = $uuid WHERE id = $client_id

API Gateway /api/accounts routes
  └─► publishes to [account-events] queue
            │
            ▼
     Account Service (consumer)
            │
            ▼
    INSERT / UPDATE / DELETE accounts table
```

---

## gRPC Port

| Context                 | Port    |
| ----------------------- | ------- |
| Internal Docker network | `50054` |
| Health HTTP (host)      | `15054` |

---

## RPC Methods (`user.proto`)

| Method         | Description                                              |
| -------------- | -------------------------------------------------------- |
| `ListAccounts` | Return accounts for a given client (or all if no filter) |

---

## RabbitMQ Queues

| Queue               | Producer     | What triggers it                                       |
| ------------------- | ------------ | ------------------------------------------------------ |
| `client-registered` | Auth Service | `RegisterClient` RPC — assigns `account_id` UUID       |
| `account-events`    | API Gateway  | `/api/accounts` routes — create, delete, status-update |

### `account-events` message types

| `type` field            | Action                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| `CREATE_ACCOUNT`        | Inserts a new row in `accounts` for the given client and currency |
| `DELETE_ACCOUNT`        | Removes the account row by `account_id`                           |
| `UPDATE_ACCOUNT_STATUS` | Sets `status` to `ACTIVE` or `INACTIVE`                           |

---

## Database

Shares `auth_db` with Auth Service and User Service.

| Table      | Operations                                                       |
| ---------- | ---------------------------------------------------------------- |
| `clients`  | `UPDATE ... SET account_id` (on `client-registered` events)      |
| `accounts` | `INSERT`, `DELETE`, `UPDATE status` (on `account-events` events) |

---

## Environment Variables

| Variable          | Description                                | Default                           |
| ----------------- | ------------------------------------------ | --------------------------------- |
| `PORT`            | gRPC listen port                           | `50054`                           |
| `HEALTH_PORT`     | HTTP health port                           | `15054`                           |
| `AUTH_DB_URL`     | PostgreSQL connection string for `auth_db` | —                                 |
| `LOG_SERVICE_URL` | Log service gRPC address                   | `localhost:50052`                 |
| `RABBITMQ_URL`    | RabbitMQ connection string                 | `amqp://app:secret@rabbitmq:5672` |
| `NODE_ENV`        | Runtime environment                        | `development`                     |

---

## Local Development

```bash
cd account-service
npm install
cp .env.example .env
# Edit .env — set AUTH_DB_URL and RABBITMQ_URL
npm start
```

With Docker Compose (recommended):

```bash
docker compose up account-service
```

---

## Health Check

```
GET http://localhost:15054/health
```

Returns `{ "status": "ok", "service": "account-service" }`.
