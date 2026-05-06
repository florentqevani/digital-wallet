# GRPC App

A production-grade microservices platform with two client experiences:

- **Web back-office** — React (Vite) + Web BFF
- **Mobile app** — Flutter + Mobile BFF

Every request follows a strict chain:

```
Frontend → BFF → API Gateway → gRPC microservice → PostgreSQL / RabbitMQ
```

---

## Service READMEs

| Service | Description |
|---|---|
| [proto-contracts](proto-contracts/readME.md) | Shared Protobuf definitions (npm package) |
| [api-gateway](api-getaway/README.md) | HTTP edge — routes requests to gRPC services |
| [auth-service](auth_service/ReadME.md) | JWT auth — register, login, validate tokens |
| [user-service](user-service/README.md) | Back-office user & client management |
| [account-service](account-service/README.md) | Async account provisioning via RabbitMQ |
| [payment-service](payment-service/readme.md) | Internal wallet — transfers, top-ups, balances |
| [log-service](log-service/ReadME.md) | Centralised audit log — gRPC + RabbitMQ consumer |
| [web-bff](web-bff/ReadME.md) | Backend-for-Frontend for the React web app |
| [mobile-bff](mobile-bff/ReadME.md) | Backend-for-Frontend for the Flutter mobile app |
| [web-frontend](web-frontend/README.md) | React back-office SPA |
| [mobile-frontend](mobile_frontend/README.md) | Flutter mobile app |

---

## 1) High-Level Architecture

```mermaid
flowchart LR
  subgraph Clients
    WF[Web Frontend\nVite + React]
    MF[Mobile Frontend\nFlutter]
  end

  subgraph BFF Layer
    WB[Web BFF\nHTTP :3104]
    MB[Mobile BFF\nHTTP :3002]
  end

  subgraph Edge Layer
    AG[API Gateway\nHTTP :18080 / :8080 in-network]
  end

  subgraph gRPC Services
    AS[Auth Service\ngRPC :50051]
    LS[Log Service\ngRPC :50052]
    US[User Service\ngRPC :50053]
    ACS[Account Service\nno port - RMQ only]
    PS[Payment Service\ngRPC :50055]
  end

  subgraph Messaging
    RMQ[RabbitMQ\n:5672 / UI :15672]
    SL[[service-logs queue]]
    CR[[client-registered queue]]
  end

  subgraph Data
    P[(PostgreSQL\n:5433 host / :5432 network)]
    ADB[(auth_db)]
    LDB[(log_db)]
  end

  WF -->|HTTP| WB
  MF -->|HTTP| MB

  WB -->|HTTP proxy| AG
  MB -->|HTTP proxy| AG

  AG -->|gRPC| AS
  AG -->|gRPC| LS
  AG -->|gRPC| US
  AG -->|gRPC| PS

  AS -->|publish| SL
  AS -->|publish| CR
  US -->|publish| SL
  PS -->|publish| SL
  SL --- RMQ
  CR --- RMQ
  RMQ -->|consume| LS
  RMQ -->|consume| ACS

  AS --> ADB
  US --> ADB
  PS --> ADB
  ACS --> ADB
  LS --> LDB

  P --- ADB
  P --- LDB
```

---

## 2) Repository Structure

```text
GRPC_app/
├── docker-compose.yml        ← Orchestrates all services
├── Dockerfile.service        ← Single shared Dockerfile for Node services
├── proto-contracts/          ← Shared .proto files + npm package
├── api-getaway/              ← API Gateway (HTTP → gRPC)
├── auth_service/             ← Auth gRPC service
├── account-service/          ← Account provisioning (RabbitMQ consumer only)
├── user-service/             ← User & client management gRPC service
├── payment-service/          ← Internal wallet gRPC service
├── log-service/              ← Audit log gRPC service + RMQ consumer
├── web-bff/                  ← Web Backend-for-Frontend (HTTP)
├── mobile-bff/               ← Mobile Backend-for-Frontend (HTTP)
├── web-frontend/             ← React back-office (Vite)
└── mobile_frontend/          ← Flutter mobile app
```

---

## 3) Core Roles and Responsibilities

### Web Frontend
- Talks only to Web BFF
- Sidebar navigation with collapsible menu (collapse/expand at will)
- Main pages:
  - **Dashboard** — log summary metrics and latest activity (superadmin)
  - **Users** — back-office user CRUD (superadmin)
  - **Accounts** — client listing and management (admin/superadmin)
  - **Payments** — top-up wallets, balance lookup, full transaction ledger (admin/superadmin)
  - **My Logs** — personal audit log with filters (all roles)

### Web BFF
- Talks to API Gateway over HTTP (not directly to gRPC services)
- Exposes web-facing routes:
  - `/api/auth/*`
  - `/api/logs/*`
  - `/api/users/*`
  - `/api/payments/*`
- Adds frontend-specific shaping and error handling

### Mobile Frontend
- Talks only to Mobile BFF
- Main features:
  - Register/login client (JWT stored in SharedPreferences)
  - Balance card showing "Signed in as [name]" and current balance
  - Activity tab (paginated audit log with infinite scroll)
  - Transactions tab (transfer history with +/- colour coding)
  - Send Money dialog (peer-to-peer transfer by email)

### Mobile BFF
- Talks to API Gateway over HTTP
- Exposes mobile-facing routes:
  - `/api/auth/*`
  - `/api/payments/*` — transfer, balance, history
- Aggregates login: authenticate + fetch recent activity in one response

### API Gateway
- Central HTTP entry for internal BFFs and external API tests
- Applies middleware (request logging, rate limiting, JWT checks)
- Forwards to gRPC services:
  - AuthService, LogService, UserService, PaymentService
- Supports both prefixed and non-prefixed route mounting:
  - `/auth`, `/logs`, `/users`
  - `/api/auth`, `/api/logs`, `/api/users`, `/api/payments`

### Payment Service (gRPC)
- Internal wallet system — no external payment gateway
- Stores client balances and transactions in `auth_db`
- `TransferFunds` — atomic peer-to-peer transfer between two clients
- `AdminTopUp` — admin credits a client's wallet (creates money in the system)
- `GetBalance` — returns current balance for a client
- `GetTransactionHistory` — paginated ledger; omit `client_id` to get all transactions
- Publishes `TOPUP` and `PAYMENT_COMPLETED` events to the `service-logs` RabbitMQ queue

### Auth Service (gRPC)
- Client registration and login (`RegisterClient`, `LoginClient`)
- Backoffice user login (`LoginUser`)
- JWT signing and token creation (`CreateToken`)
- JWT validation (`ValidateToken`)
- JWTs carry `{ id, name, role, permissions }` claims embedded at login time
- Publishes audit log events to `service-logs` and `client-registered` RabbitMQ queues

### Log Service (gRPC)
- Write audit events (`WriteLog`)
- Query audit events with filters + pagination (`QueryLogs`)
- Persists to `log_db.logs`
- Consumes the `service-logs` RabbitMQ queue (auto-reconnecting)

### User Service (gRPC)
- Role and user management (owns role field on all users)
- Full user CRUD for superadmin: `RegisterUser`, `ListUsers`, `UpdateUser`, `DeleteUser`
- Full client CRUD for admin: `ListClients`, `UpdateClient`, `DeleteClient`
- Reads and writes `auth_db.users` and `auth_db.clients`
- Publishes audit log events to the `service-logs` RabbitMQ queue

### RabbitMQ
- Message broker for decoupled audit log delivery and account provisioning
- Queues:
  - `service-logs` (durable) — Producers: Auth, User, Payment services → Consumer: Log Service
  - `client-registered` (durable) — Producer: Auth Service → Consumer: Account Service
- Management UI: `http://localhost:15672`

### PostgreSQL
- Single Postgres container, multiple databases:
  - `auth_db` — clients, users, transactions, balances
  - `log_db` — audit logs

---

## 4) Contracts (Proto Files)

Shared contracts live in `proto-contracts/proto` and are consumed via local npm dependency `@myapp/proto-contracts`.

- `auth.proto` — `RegisterClient`, `LoginClient`, `LoginUser`, `ValidateToken`, `CreateToken`
- `log.proto` — `WriteLog`, `QueryLogs`
- `user.proto` — `ListUsers`, `RegisterUser`, `UpdateUser`, `DeleteUser`, `ListClients`, `UpdateClient`, `DeleteClient`
- `payment.proto` — `TransferFunds`, `AdminTopUp`, `GetBalance`, `GetTransactionHistory`

---

## 5) Request Flows (How It Works)

### A) Web Backoffice Login
1. Web UI → `POST /api/auth/login` on Web BFF
2. Web BFF → Gateway `POST /api/auth/login`
3. Gateway → gRPC `AuthService.LoginUser`
4. Auth Service verifies `auth_db.users`, returns JWT with `{ id, name, role, permissions }`

### B) Mobile Client Login
1. Flutter → `POST /api/auth/login` on Mobile BFF
2. Mobile BFF → Gateway `POST /api/auth/login-client`
3. Gateway → gRPC `AuthService.LoginClient`
4. Mobile BFF also fetches recent activity from Gateway `POST /api/logs/query`
5. Returns merged `{ token, role, success, recentActivity }`

### C) Mobile Send Money (Transfer)
1. Flutter → `POST /api/payments/transfer` on Mobile BFF with `{ to_email, amount, note }`
2. Mobile BFF → Gateway `POST /api/payments/transfer-by-email`
3. Gateway resolves `to_email` → `client_id` via UserService, then calls `PaymentService.TransferFunds`
4. Payment Service runs atomic debit/credit in `auth_db`, records transaction
5. Payment Service publishes `PAYMENT_COMPLETED` log event to RabbitMQ

### D) Admin Top-Up
1. Web UI → `POST /api/payments/topup` via Web BFF
2. Gateway → gRPC `PaymentService.AdminTopUp`
3. Payment Service credits balance, records `TOPUP` transaction
4. Publishes `TOPUP` log event to RabbitMQ → Log Service persists it

### E) View All Transactions (Admin)
1. Web UI → `GET /api/payments/history` (no `client_id` param) via Web BFF
2. Gateway passes empty `client_id` to PaymentService
3. `GetTransactionHistory` returns full ledger (no `WHERE` filter) with pagination

### F) Web Dashboard
1. Web UI → `/api/logs/dashboard` via Web BFF
2. Gateway calls `LogService.QueryLogs` multiple times (per actor type)
3. Returns summary counts + log slices to UI

---

## 6) Ports and Endpoints

### Host-Mapped Ports
- PostgreSQL: `5433`
- RabbitMQ AMQP: `5672`
- RabbitMQ Management UI: `15672`
- API Gateway: `18080`
- Web BFF: `3104`
- Mobile BFF: `3002`
- Auth health: `15051`
- Log health: `15052`
- User health: `15053`

### Internal-Only Ports (Docker network)
- Auth Service gRPC: `50051`
- Log Service gRPC: `50052`
- User Service gRPC: `50053`
- Payment Service gRPC: `50055`

### Typical HTTP Entry Points
- Web BFF API: `http://localhost:3104`
- Mobile BFF API: `http://localhost:3002`
- Gateway API: `http://localhost:18080`

---

## 7) Data Model Overview

### Databases
- `auth_db`: `clients`, `users`, `transactions` (wallet ledger)
- `log_db`: `logs` (actor / action / status / message / timestamp)

### SQL Init
- `log-service/db/init.sql` — creates `logs` table and indexes
- `auth_service/db/init.sql` — creates `clients`, `users` tables
- `payment-service` uses the same `auth_db` for `transactions` and balance columns on `clients`

---

## 8) Configuration and Environment

### Docker Compose (Primary Runtime)
All services communicate via Docker internal DNS:

| Service | DNS name |
|---|---|
| API Gateway | `api-gateway:8080` |
| Auth Service | `auth-service:50051` |
| Log Service | `log-service:50052` |
| User Service | `user-service:50053` |
| Payment Service | `payment-service:50055` |
| PostgreSQL | `postgres:5432` |
| RabbitMQ | `rabbitmq:5672` |

Key shared env vars:
- `JWT_SECRET` — shared between Auth Service, API Gateway, and BFFs
- `RABBITMQ_URL=amqp://app:secret@rabbitmq:5672` — Auth, User, Payment, and Log services
- `AUTH_DB_URL` — Auth, User, Account, and Payment services

---

## 9) Running the Stack

```bash
# Start everything
docker compose up -d

# Rebuild a single service after code changes
docker compose build --no-cache <service-name>
docker compose up -d <service-name>

# View logs
docker compose logs -f <service-name>
```

A production-grade microservices platform with two client experiences:

- **Web back-office** — React (Vite) + Web BFF
- **Mobile app** — Flutter + Mobile BFF

Every request follows a strict chain:

```
Frontend → BFF → API Gateway → gRPC microservice → PostgreSQL / RabbitMQ
```

---

## Service READMEs

| Service | Description |
|---|---|
| [proto-contracts](proto-contracts/readME.md) | Shared Protobuf definitions (npm package) |
| [api-gateway](api-getaway/README.md) | HTTP edge — routes requests to gRPC services |
| [auth-service](auth_service/ReadME.md) | JWT auth — register, login, validate tokens |
| [user-service](user-service/README.md) | Back-office user & client management |
| [account-service](account-service/README.md) | Async account provisioning via RabbitMQ |
| [payment-service](payment-service/README.md) | Payment initiation & confirmation via RaiAccept |
| [log-service](log-service/ReadME.md) | Centralised audit log — gRPC + RabbitMQ consumer |
| [web-bff](web-bff/ReadME.md) | Backend-for-Frontend for the React web app |
| [mobile-bff](mobile-bff/ReadME.md) | Backend-for-Frontend for the Flutter mobile app |
| [web-frontend](web-frontend/README.md) | React back-office SPA |
| [mobile-frontend](mobile_frontend/README.md) | Flutter mobile app |

---

## 1) High-Level Architecture

```mermaid
flowchart LR
  subgraph Clients
    WF[Web Frontend\nVite + React]
    MF[Mobile Frontend\nFlutter]
  end

  subgraph BFF Layer
    WB[Web BFF\nHTTP :3104]
    MB[Mobile BFF\nHTTP :3002]
  end

  subgraph Edge Layer
    AG[API Gateway\nHTTP :18080 / :8080 in-network]
  end

  subgraph gRPC Services
    AS[Auth Service\ngRPC :50051]
    LS[Log Service\ngRPC :50052]
    US[User Service\ngRPC :50053]
    ACS[Account Service\nno port - RMQ only]
    PS[Payment Service\ngRPC :50055]
  end

  subgraph External
    RAI[RaiAccept API]
  end

  subgraph Messaging
    RMQ[RabbitMQ\n:5672 / UI :15672]
    SL[[service-logs queue]]
    CR[[client-registered queue]]
  end

  subgraph Data
    P[(PostgreSQL\n:5433 host / :5432 network)]
    ADB[(auth_db)]
    LDB[(log_db)]
  end

  WF -->|HTTP| WB
  MF -->|HTTP| MB

  WB -->|HTTP proxy| AG
  MB -->|HTTP proxy| AG

  AG -->|gRPC| AS
  AG -->|gRPC| LS
  AG -->|gRPC| US
  AG -->|gRPC| PS

  PS -->|HTTPS| RAI

  AS -->|publish| SL
  AS -->|publish| CR
  US -->|publish| SL
  SL --- RMQ
  CR --- RMQ
  RMQ -->|consume| LS
  RMQ -->|consume| ACS

  AS --> ADB
  US --> ADB
  ACS --> ADB
  LS --> LDB

  P --- ADB
  P --- LDB
```

---

## 2) Repository Structure

```text
GRPC_app/
├── docker-compose.yml        ← Orchestrates all services
├── Dockerfile.service        ← Single shared Dockerfile for Node services
├── proto-contracts/          ← Shared .proto files + npm package
├── api-getaway/              ← API Gateway (HTTP → gRPC)
├── auth_service/             ← Auth gRPC service
├── account-service/          ← Account provisioning (RabbitMQ consumer only)
├── user-service/             ← User & client management gRPC service
├── payment-service/          ← Payment gRPC service (RaiAccept)
├── log-service/              ← Audit log gRPC service + RMQ consumer
├── web-bff/                  ← Web Backend-for-Frontend (HTTP)
├── mobile-bff/               ← Mobile Backend-for-Frontend (HTTP)
├── web-frontend/             ← React back-office (Vite)
└── mobile_frontend/          ← Flutter mobile app
```

---

## 3) Core Roles and Responsibilities

### Web Frontend
- Talks only to Web BFF
- Main features:
  - Backoffice login
  - Dashboard metrics
  - Logs query UI
  - User management (create/list/update/delete)

### Web BFF
- Talks to API Gateway over HTTP (not directly to gRPC services)
- Exposes web-facing routes:
  - `/api/auth/*`
  - `/api/logs/*`
  - `/api/users/*`
- Adds frontend-specific shaping and error handling

### Mobile Frontend
- Talks only to Mobile BFF
- Main features:
  - Register/login client
  - Session persistence
  - Recent activity view

### Mobile BFF
- Talks to API Gateway over HTTP
- Exposes mobile-facing routes:
  - `/api/auth/*`
  - `/api/payments/*` — initiates and confirms RaiAccept card payments
- Performs a small aggregation on login:
  - authenticate client
  - fetch recent client logs
  - return merged response
- Builds RaiAccept callback URLs (`success`, `fail`, `cancel`) and webhook URL, then forwards to the Gateway

### API Gateway
- Central HTTP entry for internal BFFs and external API tests
- Applies middleware (request logging, rate limiting, JWT checks)
- Forwards to gRPC services:
  - AuthService
  - LogService
  - UserService
  - PaymentService
- Supports both prefixed and non-prefixed route mounting:
  - `/auth`, `/logs`, `/users`
  - `/api/auth`, `/api/logs`, `/api/users`, `/api/payments`

### Payment Service (gRPC)
- Owns all communication with the external RaiAccept payment API
- Authenticates with RaiAccept via Amazon Cognito on every call
- `InitiatePayment` — creates a RaiAccept order + checkout session and returns the hosted payment form URL
- `ConfirmPayment` — polls RaiAccept for order status and returns `success` / order status string
- Called exclusively by API Gateway; never reached directly by BFFs or frontends

### Auth Service (gRPC)
- Client registration and login (`RegisterClient`, `LoginClient`)
- Backoffice user login (`LoginUser`)
- JWT signing and token creation (`CreateToken`)
- JWT validation (`ValidateToken`)
- JWTs carry `role` and `permissions[]` claims embedded at login time
- Publishes audit log events to the `service-logs` RabbitMQ queue (fire-and-forget)

### Log Service (gRPC)
- Write audit events
- Query audit events with filters + pagination
- Persists to `log_db.logs`
- Consumes the `service-logs` RabbitMQ queue and inserts records into PostgreSQL

### User Service (gRPC)
- Role and user management (owns role field on all users)
- Full user CRUD for superadmin: `RegisterUser`, `ListUsers`, `UpdateUser`, `DeleteUser`
- Full client CRUD for admin: `ListClients`, `UpdateClient`, `DeleteClient`
- Reads and writes `auth_db.users` and `auth_db.clients`
- Publishes audit log events to the `service-logs` RabbitMQ queue (fire-and-forget)

### RabbitMQ
- Message broker for decoupled audit log delivery
- Queue: `service-logs` (durable)
- Producers: Auth Service, User Service
- Consumer: Log Service (auto-reconnecting)
- Management UI available at `http://localhost:15672` (credentials in docker-compose)

### PostgreSQL
- Single Postgres container, multiple databases:
  - `auth_db`
  - `log_db`

---

## 4) Contracts (Proto Files)

Shared contracts live in `proto-contracts/proto` and are consumed by services through local npm dependency `@myapp/proto-contracts`.

- `auth.proto`
  - `RegisterClient`, `LoginClient`, `LoginUser`, `ValidateToken`, `CreateToken`
- `log.proto`
  - `WriteLog`, `QueryLogs`
- `user.proto`
  - `ListUsers`, `RegisterUser`, `UpdateUser`, `DeleteUser`
  - `ListClients`, `UpdateClient`, `DeleteClient`
- `payment.proto`
  - `InitiatePayment` — start a card payment session, returns redirect URL and order ID
  - `ConfirmPayment` — verify a completed payment by order ID, returns status

These contracts define service boundaries and keep gateway/service integration consistent.

---

## 5) Request Flows (How It Works)

### A) Web Backoffice Login Flow
1. Web UI calls `POST /api/auth/login` on Web BFF
2. Web BFF proxies to API Gateway `POST /api/auth/login`
3. Gateway calls gRPC `AuthService.LoginUser`
4. Auth Service verifies `auth_db.users` credentials, returns JWT + role
5. JWT and role travel back to UI

### B) Mobile Client Login Flow
1. Flutter app calls `POST /api/auth/login` on Mobile BFF
2. Mobile BFF proxies auth to Gateway `POST /api/auth/login-client`
3. Gateway calls gRPC `AuthService.LoginClient`
4. On success, Mobile BFF calls Gateway `POST /api/logs/query` for recent activity
5. Mobile BFF returns merged payload `{ token, role, success, message, recentActivity }`

### C) Web Dashboard Flow
1. Web UI calls `/api/logs/dashboard` (and optional `/api/logs/all` for manual queries)
2. Web BFF proxies to Gateway
3. Gateway verifies JWT role (`superadmin` for dashboard/all)
4. Gateway calls gRPC `LogService.QueryLogs` multiple times (client/user/superadmin views)
5. Gateway returns summary + log slices to UI

### D) User Management Flow (Superadmin)
1. UI calls `/api/users` (GET, PUT, DELETE) and `/api/auth/register-user` (POST)
2. Web BFF proxies to Gateway
3. Gateway enforces superadmin JWT
4. All operations go to User Service:
   - GET list: `UserService.ListUsers`
   - POST: `UserService.RegisterUser`
   - PUT: `UserService.UpdateUser`
   - DELETE: `UserService.DeleteUser`
5. User Service writes audit entries to Log Service for mutating operations

### E) Client Management Flow (Admin/Superadmin)
1. UI calls `/api/clients` (GET, PUT, DELETE)
2. Web BFF proxies to Gateway
3. Gateway enforces JWT role check
4. All operations go to User Service:
   - GET list: `UserService.ListClients`
   - PUT: `UserService.UpdateClient`
   - DELETE: `UserService.DeleteClient`
5. User Service writes audit entries to Log Service

### F) Mobile Payment Flow
1. Flutter calls `POST /api/payments/initiate` on Mobile BFF with `{ amount }`
2. Mobile BFF builds callback URLs and forwards to Gateway `POST /api/payments/initiate`
3. Gateway (JWT-gated) calls gRPC `PaymentService.InitiatePayment`
4. Payment Service authenticates with RaiAccept, creates order + checkout session
5. Flutter receives `{ paymentFormUrl, raiOrderId }` and opens a WebView
6. User completes card payment on the hosted RaiAccept page
7. Flutter WebView intercepts the `success` callback URL and closes the WebView
8. Flutter calls `POST /api/payments/confirm` on Mobile BFF with `{ raiOrderId, amount }`
9. Mobile BFF forwards to Gateway `POST /api/payments/confirm`
10. Gateway calls gRPC `PaymentService.ConfirmPayment` to verify the order status
11. On confirmed payment, Gateway calls gRPC `UserService.AddBalance` to credit the client
12. Success response travels back to Flutter

---

## 6) Ports and Endpoints

### Host-Mapped Ports
- PostgreSQL: `5433`
- RabbitMQ AMQP: `5672`
- RabbitMQ Management UI: `15672`
- API Gateway: `18080`
- Web BFF: `3104`
- Mobile BFF: `3002`
- Auth health: `15051`
- Log health: `15052`
- User health: `15053`

### Internal-Only Ports (Docker network, not host-mapped)
- Auth Service gRPC: `50051`
- Log Service gRPC: `50052`
- User Service gRPC: `50053`
- Payment Service gRPC: `50055`

### Typical Public HTTP Entry Points
- Web frontend dev server: Vite local port (when running `npm run dev`)
- Web BFF API: `http://localhost:3104`
- Mobile BFF API: `http://localhost:3002`
- Gateway API: `http://localhost:18080`

---

## 7) Data Model Overview

### Databases
- `auth_db`:
  - `clients` (mobile users)
  - `users` (backoffice users; role `user` or `superadmin`)
- `log_db`:
  - `logs` (actor/action/status/message/timestamp)

### Existing SQL Init in Repo
- `docker/postgres-init/01-create-databases.sql` creates DBs only.
- `log-service/db/init.sql` defines the `logs` table and indexes.

If your environment is fresh, ensure auth tables exist in `auth_db` before first auth operations.

---

## 8) Configuration and Environment

### Docker Compose (Primary Runtime)
All services are connected through Docker internal DNS names:
- `api-gateway`, `auth-service`, `log-service`, `user-service`, `postgres`, `rabbitmq`

BFFs use:
- `API_GATEWAY_URL=http://api-gateway:8080`

Gateway uses:
- `AUTH_SERVICE_URL=auth-service:50051`
- `LOG_SERVICE_URL=log-service:50052`
- `USER_SERVICE_URL=user-service:50053`
- `PAYMENT_SERVICE_URL=payment-service:50055`

Auth Service, User Service, and Log Service use:
- `RABBITMQ_URL=amqp://app:secret@rabbitmq:5672`

Payment Service uses:
- `RAIACCEPT_USERNAME` / `RAIACCEPT_PASSWORD` — RaiAccept merchant credentials

Mobile BFF uses:
- `RAIACCEPT_WEBHOOK_URL` — public URL for RaiAccept server-to-server notifications
- `RAIACCEPT_MOBILE_CALLBACK_BASE` — base URL intercepted by the Flutter WebView (e.g. `http://mobile.callback`)

### Web Frontend Config
- `VITE_WEB_BFF_URL` (defaults to `http://localhost:3104`)

### Mobile Frontend Config
- compile-time override: `MOBILE_API_BASE_URL`
- defaults:
  - web/desktop: `http://localhost:3002`
  - Android emulator: `http://10.0.2.2:3002`

---

## 9) Run the Full Stack

From repository root:

```bash
docker compose up --build -d
```

Check status:

```bash
docker compose ps
```

Check logs:

```bash
docker logs grpc_app-api-gateway-1 --tail 100
docker logs grpc_app-web-bff-1 --tail 100
docker logs grpc_app-mobile-bff-1 --tail 100
docker logs grpc_app-log-service-1 --tail 50   # look for: [LogConsumer] RabbitMQ connected
docker logs grpc_app-auth-service-1 --tail 20  # look for: [LogProducer] RabbitMQ channel ready
```

RabbitMQ management UI: `http://localhost:15672` (user: `app`, pass: `secret`)

---

## 10) Local App Development (Optional)

### Web Frontend
```bash
cd web-frontend
npm install
npm run dev
```

### Mobile Frontend
```bash
cd mobile_frontend
flutter pub get
flutter run -d chrome
```

---

## 11) Health and Smoke Checks

### Health
- Gateway: `GET http://localhost:18080/health`
- Web BFF: `GET http://localhost:3104/health`
- Mobile BFF: `GET http://localhost:3002/health`

### Useful smoke path checks
1. Backoffice login via Web BFF
2. Dashboard data via Web BFF
3. User list via Gateway `/api/users`
4. Client register/login via Mobile BFF

---

## 12) Security and Access Control

- JWT is issued and signed exclusively by Auth Service (login, register, `CreateToken`).
- JWTs carry both `role` and `permissions[]` claims embedded at login time.
- **Local JWT verification**: BFFs and API Gateway verify tokens locally using the shared secret — no round-trip to Auth Service on every request.
- Role data is owned by User Service; roles and permissions are embedded into the JWT at login time by Auth Service.
- Session persistence:
  - Web frontend: JWT + role + permissions stored in `localStorage`.
  - Mobile frontend: JWT + role + permissions stored in `SharedPreferences`.
- Superadmin-only routes include:
  - `/api/auth/register-user`
  - `/api/auth/users`
  - `/api/users`
  - `/api/logs/dashboard`
  - `/api/logs/all`

Rate limiting is applied in API Gateway and auth routes.

---

## 13) Known Operational Notes

- If code changes are baked into images, `docker compose restart` is not enough.
  Use:
  - `docker compose up -d --build <service>`
- Gateway container recreation can occasionally race during repeated rebuilds; if so:
  - remove stale container
  - start gateway again

---

## 14) Why This Architecture

This setup separates concerns clearly:

- Frontends remain thin and UX-focused.
- BFFs isolate frontend-specific API shaping.
- API Gateway centralizes auth checks, throttling, and service routing.
- gRPC services stay focused and independently evolvable.
- Shared proto contracts keep service boundaries explicit and stable.

Result: easier scaling, safer change boundaries, and cleaner ownership across web, mobile, and core platform services.
