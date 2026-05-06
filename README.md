# GRPC App

A microservices platform with two client experiences:

- **Web back-office** — React (Vite) SPA, served through the Web BFF
- **Mobile app** — Flutter app, served through the Mobile BFF

Every request travels the same chain regardless of which client initiates it:

```
Client → BFF → API Gateway → gRPC service → PostgreSQL / RabbitMQ
```

Frontends only know their BFF's address. BFFs only know the API Gateway's address. The Gateway is the only component that speaks gRPC to the business services. This strict layering means any single layer can be changed, scaled, or replaced without touching the others.

---

## Repository Layout

```
GRPC_app/
├── Dockerfile.service         Single Dockerfile shared by all Node services
├── docker-compose.yml         Full-stack orchestration
├── proto-contracts/           Shared Protobuf definitions (local npm package)
├── api-getaway/               API Gateway — HTTP-to-gRPC translation
├── auth_service/              Auth gRPC service
├── user-service/              User and client management gRPC service
├── payment-service/           Internal wallet gRPC service
├── log-service/               Audit log gRPC service + RabbitMQ consumer
├── account-service/           Account provisioning (RabbitMQ consumer only, no HTTP/gRPC port)
├── web-bff/                   Backend-for-Frontend for the React web app
├── mobile-bff/                Backend-for-Frontend for the Flutter app
├── web-frontend/              React back-office SPA (Vite)
└── mobile_frontend/           Flutter mobile app
```

---

## Services

| Service | Type | Internal port | Role |
|---|---|---|---|
| `auth-service` | gRPC | `50051` | Issues and validates JWTs; authenticates clients and back-office users |
| `user-service` | gRPC | `50053` | CRUD for back-office users and mobile clients; balance and currency management |
| `payment-service` | gRPC | `50055` | Internal wallet: transfers, top-ups, transaction ledger |
| `log-service` | gRPC + RMQ | `50052` | Persists audit events via direct gRPC calls and RabbitMQ consumer |
| `account-service` | RMQ consumer | — | Assigns account IDs to new clients after registration |
| `api-gateway` | HTTP | `8080` | Translates HTTP to gRPC; enforces auth, roles, and rate limiting |
| `web-bff` | HTTP | `3004` | BFF for React; verifies JWTs and proxies to the Gateway |
| `mobile-bff` | HTTP | `3002` | BFF for Flutter; aggregates login response and proxies payments |
| `web-frontend` | SPA | `5173` dev | React back-office UI |
| `mobile_frontend` | Flutter | — | Mobile client app |
| `proto-contracts` | npm package | — | Shared `.proto` files consumed by all Node gRPC services |

---

## How It All Connects

### The BFF Layer

The platform has two BFFs — one per frontend. Each BFF is the **only** endpoint its frontend ever contacts. The frontend has no knowledge of the API Gateway or any gRPC service address.

**Web BFF** (host port `3104`):
- Verifies the JWT locally on every authenticated request using the shared `JWT_SECRET` — no round-trip to Auth Service
- Proxies all requests to the API Gateway over HTTP
- Handles CORS and web-specific error formatting

**Mobile BFF** (host port `3002`):
- Same JWT verification and proxy behaviour as Web BFF
- Additionally **aggregates the login response**: after authenticating the client it immediately fetches the last 5 audit events for that client and returns both in a single response, eliminating an extra round-trip from the mobile app

### The API Gateway

The API Gateway (host port `18080`, internal `8080`) is the only component that speaks gRPC. BFFs send it plain HTTP; it translates to gRPC and returns JSON. On every request it:

1. Decodes and verifies the JWT from the `Authorization: Bearer` header (local decode using `JWT_SECRET` — Auth Service is never called for validation)
2. Checks the `role` claim against per-route requirements (`client`, `user`, or `superadmin`)
3. Applies rate limiting globally (express-rate-limit, configurable window and max)
4. Forwards to the correct gRPC service
5. Returns the gRPC response as JSON

### The gRPC Services

Each service owns its data, has its own database access, and exposes a typed API defined in `.proto` contracts.

**Auth Service** — the credential authority. Verifies passwords with bcrypt, signs JWTs, and embeds `{ id, name, role, permissions }` into every token at login time. After registering a new client it publishes to two RabbitMQ queues: `service-logs` (audit) and `client-registered` (account provisioning).

**User Service** — manages user and client records in `auth_db`. Superadmins manage back-office users; admins manage clients. Exposes balance and currency setters used by the Gateway. Publishes to `service-logs` after any mutation.

**Payment Service** — the internal wallet. `TransferFunds` debits the sender and credits the receiver atomically in a single `BEGIN … COMMIT` transaction, then records the transfer in the `transactions` table. `AdminTopUp` credits a client without a matching debit. After every successful commit it publishes a `PAYMENT_COMPLETED` or `TOPUP` event to `service-logs`.

**Log Service** — the audit store. Accepts direct gRPC `WriteLog` calls and concurrently consumes the `service-logs` RabbitMQ queue. Exposes `QueryLogs` with full filter support (actor, date range, action, pagination) for dashboards and activity feeds.

**Account Service** — has no HTTP or gRPC port. It only consumes the `client-registered` queue. When Auth Service registers a new client, Account Service picks up the message and writes the client's `account_id` back to `auth_db.clients`.

### The Messaging Layer

Two durable RabbitMQ queues:

| Queue | Producers | Consumer | Purpose |
|---|---|---|---|
| `service-logs` | Auth, User, Payment | Log Service | Decoupled, loss-free audit event delivery |
| `client-registered` | Auth Service | Account Service | Triggers account ID assignment after registration |

All services publish **fire-and-forget** — they do not wait for consumer acknowledgement before returning a response to the caller. If Log Service is temporarily down, events accumulate in RabbitMQ and are consumed when it recovers. Log Service reconnects automatically with a retry loop.

### The Shared JWT

The token payload embedded at login time:

```json
{
  "id": "<user_or_client_id>",
  "name": "<display_name>",
  "role": "client | user | superadmin",
  "permissions": []
}
```

Because the role and permissions are embedded in the token itself, no service needs a database lookup to authorise a request — they decode the token locally. `JWT_SECRET` is deployed to Auth Service, both BFFs, and the API Gateway.

### The Shared Proto Contracts

All gRPC services and the API Gateway share Protobuf definitions from `proto-contracts/`. Each Node service installs the package as a local npm dependency:

```json
"@myapp/proto-contracts": "file:../proto-contracts"
```

Contracts:

| File | Methods |
|---|---|
| `auth.proto` | `RegisterClient`, `LoginClient`, `LoginUser`, `ValidateToken`, `CreateToken` |
| `user.proto` | `ListUsers`, `RegisterUser`, `UpdateUser`, `DeleteUser`, `ListClients`, `UpdateClient`, `DeleteClient`, `SetCurrency`, `SetBalance`, `GetClientBalance` |
| `payment.proto` | `TransferFunds`, `AdminTopUp`, `GetBalance`, `GetTransactionHistory` |
| `log.proto` | `WriteLog`, `QueryLogs` |

When a `.proto` file changes, reinstall the package in every affected service before rebuilding its Docker image.

---

## Data Stores

One PostgreSQL container, two databases:

| Database | Used by | Tables |
|---|---|---|
| `auth_db` | Auth, User, Account, Payment | `clients`, `users`, `transactions` |
| `log_db` | Log Service | `logs` |

`clients` has `balance` and `currency` columns that represent the current wallet state. `transactions` is the immutable ledger — every transfer and top-up is appended here. `logs` stores every audit event published by every service.

Schema initialisation:
- `auth_service/db/init.sql` — creates `clients` and `users`
- `log-service/db/init.sql` — creates `logs` with indexes on `actor_type`, `actor_id`, `created_at`, and `action`

---

## Port Reference

| Service | Host port | Internal port | Protocol |
|---|---|---|---|
| API Gateway | `18080` | `8080` | HTTP |
| Web BFF | `3104` | `3004` | HTTP |
| Mobile BFF | `3002` | `3002` | HTTP |
| PostgreSQL | `5433` | `5432` | TCP |
| RabbitMQ AMQP | `5672` | `5672` | AMQP |
| RabbitMQ UI | `15672` | `15672` | HTTP |

gRPC services have no host port mapping — they are only reachable inside the Docker network:

| Service | Internal gRPC port |
|---|---|
| Auth Service | `50051` |
| Log Service | `50052` |
| User Service | `50053` |
| Payment Service | `50055` |

---

## Request Flows

### Web Back-Office Login

```
React → POST /api/auth/login → Web BFF
Web BFF verifies request, proxies → POST /api/auth/login → API Gateway
API Gateway → gRPC AuthService.LoginUser
Auth Service checks auth_db.users, hashes password with bcrypt
Auth Service signs JWT: { id, name, role, permissions }
JWT travels back through Gateway → Web BFF → React
React stores JWT in localStorage
```

### Mobile Client Login

```
Flutter → POST /api/auth/login → Mobile BFF
Mobile BFF → POST /api/auth/login-client → API Gateway → AuthService.LoginClient
On success, Mobile BFF → GET /api/logs (last 5 events for this client) → API Gateway → LogService.QueryLogs
Mobile BFF returns merged { token, role, recentActivity } to Flutter
Flutter stores JWT in SharedPreferences, decodes name from JWT payload client-side
```

### Send Money (Flutter)

```
Flutter → POST /api/payments/transfer → Mobile BFF  { to_email, amount, note }
Mobile BFF → POST /api/payments/transfer-by-email → API Gateway
API Gateway → UserService to resolve to_email → client_id
API Gateway → PaymentService.TransferFunds { from, to, amount }
Payment Service: BEGIN; debit sender; credit receiver; INSERT transaction; COMMIT
Payment Service → publish PAYMENT_COMPLETED to service-logs (fire-and-forget)
RabbitMQ delivers message → Log Service → INSERT into log_db.logs
Success response travels back to Flutter
```

### Admin Top-Up

```
React → POST /api/payments/topup → Web BFF  { client_id, amount }
Web BFF → API Gateway → PaymentService.AdminTopUp
Payment Service: credit balance; INSERT TOPUP transaction; COMMIT
Payment Service → publish TOPUP to service-logs (fire-and-forget)
```

### View All Transactions (Admin)

```
React → GET /api/payments/history (no client_id param) → Web BFF → API Gateway
API Gateway → PaymentService.GetTransactionHistory (empty client_id = no WHERE filter)
Payment Service → SELECT * FROM transactions ORDER BY created_at DESC LIMIT/OFFSET
Returns paginated full ledger to React
```

### New Client Registration

```
Flutter → POST /api/auth/register → Mobile BFF → API Gateway → AuthService.RegisterClient
Auth Service → INSERT into auth_db.clients
Auth Service → publish to client-registered queue → Account Service assigns account_id
Auth Service → publish REGISTER event to service-logs → Log Service persists it
Auth Service → returns signed JWT to Flutter
```

### Audit Log Query (Dashboard)

```
React → GET /api/logs/dashboard → Web BFF → API Gateway
API Gateway verifies superadmin role from JWT
API Gateway → LogService.QueryLogs (multiple calls for different actor types)
Returns summary counts and recent log slices to React dashboard
```

---

## Running the Stack

```bash
# Start everything
docker compose up -d

# Rebuild one service after a code change
docker compose build --no-cache <service-name>
docker compose up -d <service-name>

# Stream logs for a service
docker compose logs -f <service-name>

# Stop everything
docker compose down
```

RabbitMQ management UI: `http://localhost:15672` — check queue depths and consumer status here.

---

## Service READMEs

Each service README covers its RPC methods, database schema, environment variables, and local development setup.

| Service | README |
|---|---|
| Auth Service | [auth_service/ReadME.md](auth_service/ReadME.md) |
| User Service | [user-service/ReadME.md](user-service/ReadME.md) |
| Payment Service | [payment-service/readme.md](payment-service/readme.md) |
| Log Service | [log-service/ReadME.md](log-service/ReadME.md) |
| Account Service | [account-service/README.md](account-service/README.md) |
| API Gateway | [api-getaway/README.md](api-getaway/README.md) |
| Web BFF | [web-bff/ReadME.md](web-bff/ReadME.md) |
| Mobile BFF | [mobile-bff/ReadME.md](mobile-bff/ReadME.md) |
| Proto Contracts | [proto-contracts/readME.md](proto-contracts/readME.md) |
| Web Frontend | [web-frontend/README.md](web-frontend/README.md) |
| Mobile Frontend | [mobile_frontend/README.md](mobile_frontend/README.md) |
