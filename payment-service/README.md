# Payment Service

> Part of the [GRPC App](../README.md) platform.

gRPC microservice that manages the internal wallet system. Handles peer-to-peer transfers, admin top-ups, balance queries, and transaction history. Publishes audit events to RabbitMQ after every successful operation.

---

## Responsibilities

- Maintain client wallet balances in `auth_db`
- Execute atomic peer-to-peer fund transfers
- Allow admins to credit client wallets (top-up)
- Expose paginated transaction history (per-client or all-clients for admins)
- Publish `TOPUP` and `PAYMENT_COMPLETED` log events to the `service-logs` RabbitMQ queue

---

## gRPC Port

| Context | Port |
|---|---|
| Internal Docker network | `50055` |
| Health HTTP (host) | `15055` |

---

## RPC Methods (`payment.proto`)

| Method | Description |
|---|---|
| `TransferFunds` | Atomic debit/credit between two clients; records a `TRANSFER` transaction |
| `AdminTopUp` | Credits a client's balance; records a `TOPUP` transaction |
| `GetBalance` | Returns current balance and currency for a client |
| `GetTransactionHistory` | Paginated ledger. Omit `client_id` to return all transactions (admin use) |

---

## Database

Uses the shared `auth_db` PostgreSQL database.

| Table | Purpose |
|---|---|
| `clients` | Stores `balance` and `currency` columns used for wallet state |
| `transactions` | Full ledger of all `TRANSFER` and `TOPUP` records |

### `transactions` columns

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `from_client_id` | UUID (nullable) | Sender; `NULL` for admin top-ups |
| `to_client_id` | UUID | Recipient |
| `amount` | Decimal | Transfer amount |
| `currency` | Text | e.g. `ALL` |
| `type` | Text | `TRANSFER` or `TOPUP` |
| `status` | Text | `COMPLETED` |
| `note` | Text | Optional memo |
| `created_at` | Timestamp | Auto-set on insert |

---

## RabbitMQ

Publishes to the `service-logs` queue (durable) after every successful commit.

| Event action | Trigger | actor_type |
|---|---|---|
| `PAYMENT_COMPLETED` | Successful `TransferFunds` | `client` |
| `TOPUP` | Successful `AdminTopUp` | `admin` |

Failed operations also publish a `FAILURE` status event for audit visibility.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | gRPC listen port | `50055` |
| `HEALTH_PORT` | HTTP health port | `15055` |
| `AUTH_DB_URL` | PostgreSQL connection string for `auth_db` | — |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://app:secret@rabbitmq:5672` |

---

## Local Development

```bash
cd payment-service
npm install
# Set AUTH_DB_URL and RABBITMQ_URL in environment
npm start
```

With Docker Compose (recommended):

```bash
docker compose build --no-cache payment-service
docker compose up -d payment-service
```