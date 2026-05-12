# User Service

> Part of the [GRPC App](../README.md) platform.

gRPC microservice responsible for managing back-office users and mobile clients. It is the source of truth for user profiles, roles, balances, and currency settings.

---

## Responsibilities

- CRUD operations on back-office **users** (superadmin-only)
- CRUD operations on mobile **clients**
- Currency and balance management per client account
- Resolve the `actor_type` of the caller dynamically for audit events
- Publish audit events to the `service-logs` queue after every mutation

---

## gRPC Port

| Context                 | Port    |
| ----------------------- | ------- |
| Internal Docker network | `50053` |
| Health HTTP (host)      | `15053` |

---

## RPC Methods (`user.proto`)

### User Management (back-office users)

| Method         | Description                           | Caller role |
| -------------- | ------------------------------------- | ----------- |
| `ListUsers`    | Return all back-office users          | superadmin  |
| `RegisterUser` | Create a back-office user             | superadmin  |
| `UpdateUser`   | Update email / name / role / password | superadmin  |
| `DeleteUser`   | Remove a back-office user             | superadmin  |

### Client Management (mobile users)

| Method         | Description                                  |
| -------------- | -------------------------------------------- |
| `ListClients`  | Return all clients with balance and currency |
| `UpdateClient` | Update email / name / password for a client  |
| `DeleteClient` | Remove a client                              |

### Account / Balance

| Method             | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `SetCurrency`      | Set the currency for a client account                     |
| `SetBalance`       | Overwrite the balance for a client account                |
| `AddBalance`       | Increment the balance (called after payment confirmation) |
| `GetClientBalance` | Return current balance and currency                       |

### Account Management

| Method                | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `ListAccounts`        | Return accounts for a client (or all accounts if no filter) |
| `CreateAccount`       | Create a new account for a client with a given currency     |
| `DeleteAccount`       | Remove an account by ID                                     |
| `UpdateAccountStatus` | Set account `status` to `ACTIVE` or `INACTIVE`              |

---

## Actor Type Resolution

`UpdateClient` and `DeleteClient` accept an optional `updated_by_role` / `deleted_by_role` field in the request. The service uses a `resolveActorType(userId, explicitRole)` helper to determine the correct `actor_type` for the audit event:

1. If `explicitRole` is `"superadmin"` or `"user"`, that value is used directly
2. Otherwise the helper queries `auth_db.users` by `userId` and reads the stored `role`
3. The resolved type is embedded in the log event published to `service-logs`

This ensures audit records correctly attribute whether an action was taken by a regular back-office user or a superadmin, regardless of how the gateway forwards the request.

---

## Database

Shares `auth_db` with Auth Service and Account Service.

| Table     | Operations                     |
| --------- | ------------------------------ |
| `users`   | SELECT, INSERT, UPDATE, DELETE |
| `clients` | SELECT, UPDATE, DELETE         |

---

## RabbitMQ

Publishes audit events to:

| Queue          | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `service-logs` | Consumed by Log Service to write audit records |

---

## Environment Variables

| Variable          | Description                                | Default           |
| ----------------- | ------------------------------------------ | ----------------- |
| `PORT`            | gRPC listen port                           | `50053`           |
| `HEALTH_PORT`     | HTTP health port                           | `15053`           |
| `AUTH_DB_URL`     | PostgreSQL connection string for `auth_db` | —                 |
| `LOG_SERVICE_URL` | Log service gRPC address                   | `localhost:50052` |
| `RABBITMQ_URL`    | RabbitMQ connection string                 | —                 |

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
