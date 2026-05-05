# Account Service

> Part of the [GRPC App](../README.md) platform.

The Account Service is a pure RabbitMQ consumer — it has no HTTP or gRPC port. Its only job is to listen for newly registered clients and assign them a unique `account_id` in the database.

---

## Responsibilities

- Consume the `client-registered` queue published by Auth Service after every `RegisterClient` call
- Generate a UUID `account_id` and write it to the `clients.account_id` column in `auth_db`
- Consume the `currency-set` queue (from `rmq-currency.js`) to handle currency assignment events
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
```

---

## No gRPC / No HTTP Port

This service exposes no network interface. It is purely event-driven.

---

## Database

Shares `auth_db` with Auth Service and User Service.

| Table | Operation |
|---|---|
| `clients` | `UPDATE ... SET account_id` |

---

## RabbitMQ Queues

| Queue | Producer | What triggers it |
|---|---|---|
| `client-registered` | Auth Service | `RegisterClient` RPC |
| `currency-set` | Auth / User Service | Currency assignment events |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `AUTH_DB_URL` | PostgreSQL connection string for `auth_db` | — |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://app:secret@rabbitmq:5672` |
| `NODE_ENV` | Runtime environment | `development` |

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

This service starts automatically with the rest of the stack and requires no manual interaction.
