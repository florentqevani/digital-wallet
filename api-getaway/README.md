# API Gateway

> Part of the [GRPC App](../README.md) platform.

The API Gateway is the single HTTP entry point for all BFFs (and direct API calls during development). It translates HTTP requests into gRPC calls to the appropriate microservice and returns the result as JSON.

---

## Responsibilities

- Accept HTTP requests from Web BFF and Mobile BFF
- Verify JWTs locally (no round-trip to Auth Service)
- Enforce role-based access control per route
- Apply rate limiting (configurable window + max requests)
- Log all incoming requests
- Forward to gRPC services: Auth, Log, User, Payment

---

## Port

| Context | Port |
|---|---|
| Host (docker-compose) | `18080` |
| Internal Docker network | `8080` |

---

## Routes

| Method | Path | gRPC call | Auth required |
|---|---|---|---|
| POST | `/api/auth/login` | `AuthService.LoginUser` | No |
| POST | `/api/auth/login-client` | `AuthService.LoginClient` | No |
| POST | `/api/auth/register` | `AuthService.RegisterClient` | No |
| POST | `/api/auth/register-user` | `UserService.RegisterUser` | superadmin |
| GET | `/api/users` | `UserService.ListUsers` | superadmin |
| PUT | `/api/users/:id` | `UserService.UpdateUser` | superadmin |
| DELETE | `/api/users/:id` | `UserService.DeleteUser` | superadmin |
| GET | `/api/clients` | `UserService.ListClients` | user / superadmin |
| PUT | `/api/clients/:id` | `UserService.UpdateClient` | user / superadmin |
| DELETE | `/api/clients/:id` | `UserService.DeleteClient` | superadmin |
| POST | `/api/add-currency` | `UserService.SetCurrency` | user / superadmin |
| POST | `/api/set-balance` | `UserService.SetBalance` | user / superadmin |
| GET | `/api/balance` | `UserService.GetClientBalance` | any authenticated |
| GET | `/api/logs` | `LogService.QueryLogs` | any authenticated |
| GET | `/api/logs/dashboard` | `LogService.QueryLogs` (multiple) | superadmin |
| GET | `/api/logs/all` | `LogService.QueryLogs` | superadmin |
| POST | `/api/payments/transfer` | `PaymentService.TransferFunds` (direct) | client |
| POST | `/api/payments/transfer-by-email` | resolve email → `PaymentService.TransferFunds` | client |
| POST | `/api/payments/topup` | `PaymentService.AdminTopUp` | user / superadmin |
| GET | `/api/payments/balance` | `PaymentService.GetBalance` | any authenticated |
| GET | `/api/payments/history` | `PaymentService.GetTransactionHistory` | any authenticated |
| GET | `/health` | — | No |

---

## Middleware

- **requestLogger** — logs method, path, status code, and response time for every request
- **apiLimiter** — express-rate-limit applied globally (default: 100 requests per 15 min)

---

## gRPC Clients

Configured in `src/grpc-clients.js`. Connects to:

| Variable | Default |
|---|---|
| `AUTH_SERVICE_URL` | `localhost:50051` |
| `LOG_SERVICE_URL` | `localhost:50052` |
| `USER_SERVICE_URL` | `localhost:50053` |
| `PAYMENT_SERVICE_URL` | `localhost:50055` |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP listen port | `8080` |
| `JWT_SECRET` | Shared JWT signing secret | — |
| `AUTH_SERVICE_URL` | Auth service gRPC address | `localhost:50051` |
| `LOG_SERVICE_URL` | Log service gRPC address | `localhost:50052` |
| `USER_SERVICE_URL` | User service gRPC address | `localhost:50053` |
| `PAYMENT_SERVICE_URL` | Payment service gRPC address | `localhost:50055` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

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

---

## Health Check

```
GET http://localhost:18080/health
```

Returns `{ "status": "ok" }`.
