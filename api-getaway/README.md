# API Gateway

> Part of the [GRPC App](../README.md) platform.

The API Gateway is the single HTTP entry point for all BFFs (and direct API calls during development). It translates HTTP requests into gRPC calls to the appropriate microservice and returns the result as JSON.

---

## Responsibilities

- Accept HTTP requests from Web BFF and Mobile BFF
- Verify JWTs locally using `JWT_SECRET` — no round-trip to Auth Service
- Enforce role-based access control per route
- Apply rate limiting (configurable window + max requests)
- Log all incoming requests
- Forward to gRPC services: Auth, Log, User, Payment

---

## Port

| Context                 | Port    |
| ----------------------- | ------- |
| Host (docker-compose)   | `18080` |
| Internal Docker network | `8080`  |

---

## Routes

| Method | Path                              | gRPC call                                                  | Required role     |
| ------ | --------------------------------- | ---------------------------------------------------------- | ----------------- |
| POST   | `/api/auth/login`                 | `AuthService.LoginUser`                                    | Public            |
| POST   | `/api/auth/login-client`          | `AuthService.LoginClient`                                  | Public            |
| POST   | `/api/auth/register`              | `AuthService.RegisterClient`                               | Public            |
| POST   | `/api/auth/register-user`         | `UserService.RegisterUser`                                 | superadmin        |
| GET    | `/api/users`                      | `UserService.ListUsers`                                    | superadmin        |
| PUT    | `/api/users/:id`                  | `UserService.UpdateUser`                                   | superadmin        |
| DELETE | `/api/users/:id`                  | `UserService.DeleteUser`                                   | superadmin        |
| GET    | `/api/clients`                    | `UserService.ListClients`                                  | user / superadmin |
| PUT    | `/api/clients/:id`                | `UserService.UpdateClient`                                 | user / superadmin |
| DELETE | `/api/clients/:id`                | `UserService.DeleteClient`                                 | superadmin        |
| POST   | `/api/add-currency`               | `UserService.SetCurrency`                                  | user / superadmin |
| POST   | `/api/set-balance`                | `UserService.SetBalance`                                   | user / superadmin |
| GET    | `/api/balance`                    | `UserService.GetClientBalance`                             | any authenticated |
| POST   | `/api/logs/write`                 | `LogService.WriteLog`                                      | any authenticated |
| POST   | `/api/logs/query`                 | `LogService.QueryLogs`                                     | any authenticated |
| GET    | `/api/logs/my-logs`               | `LogService.QueryLogs` (scoped to caller)                  | user / superadmin |
| GET    | `/api/logs/dashboard`             | `LogService.QueryLogs` (multiple calls, aggregated)        | superadmin        |
| GET    | `/api/logs/all`                   | `LogService.QueryLogs` (role-aware; merged for superadmin) | superadmin        |
| POST   | `/api/payments/transfer`          | `PaymentService.TransferFunds`                             | client            |
| POST   | `/api/payments/transfer-by-email` | Resolve email → `PaymentService.TransferFunds`             | client            |
| POST   | `/api/payments/topup`             | `PaymentService.AdminTopUp`                                | user / superadmin |
| GET    | `/api/payments/balance`           | `PaymentService.GetBalance`                                | any authenticated |
| GET    | `/api/payments/history`           | `PaymentService.GetTransactionHistory`                     | any authenticated |
| GET    | `/health`                         | —                                                          | Public            |

### Log Route Behaviour

- `GET /api/logs/my-logs` — scopes the query to `actor_id = req.user.user_id` and `actor_type = req.user.role`. Operators only see their own entries.
- `GET /api/logs/all` — for `superadmin` with no `actor_type` filter, makes two parallel gRPC calls (`actor_type: user` and `actor_type: superadmin`), merges and sorts the results by timestamp descending. Scoped `actor_type` filters pass through as a single call.
- `GET /api/logs/dashboard` — returns recent client and user log slices plus aggregate counts for the dashboard view. Requires `superadmin`.

---

## Middleware

- **requestLogger** — logs method, path, status code, and response time for every request
- **apiLimiter** — express-rate-limit applied globally (default: 100 requests per 15 minutes)
- **validateJWT** — per-route middleware; decodes JWT from `Authorization: Bearer`, verifies signature, attaches `req.user`

---

## gRPC Clients

Configured in `src/grpc-clients.js`. Connects to the following addresses (all configurable via environment variables):

| Client          | Default address   |
| --------------- | ----------------- |
| Auth Service    | `localhost:50051` |
| Log Service     | `localhost:50052` |
| User Service    | `localhost:50053` |
| Payment Service | `localhost:50055` |

---

## Environment Variables

| Variable                  | Description                  | Default           |
| ------------------------- | ---------------------------- | ----------------- |
| `PORT`                    | HTTP listen port             | `8080`            |
| `JWT_SECRET`              | Shared JWT signing secret    | —                 |
| `AUTH_SERVICE_URL`        | Auth service gRPC address    | `localhost:50051` |
| `LOG_SERVICE_URL`         | Log service gRPC address     | `localhost:50052` |
| `USER_SERVICE_URL`        | User service gRPC address    | `localhost:50053` |
| `PAYMENT_SERVICE_URL`     | Payment service gRPC address | `localhost:50055` |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window in ms      | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window      | `100`             |

---

## Local Development

```bash
cd api-getaway
npm install
cp .env.example .env
# Edit .env — set JWT_SECRET and service URLs
npm start
```

With Docker Compose (recommended):

```bash
docker compose up api-gateway
```

````

With Docker Compose (recommended):

```bash
docker compose up api-gateway
````

---

## Health Check

```
GET http://localhost:18080/health
```

Returns `{ "status": "ok" }`.
