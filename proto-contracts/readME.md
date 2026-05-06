# Proto Contracts

> Part of the [GRPC App](../README.md) platform.

Shared gRPC Protobuf definitions for all Node.js microservices. Published as a local npm package (`@myapp/proto-contracts`) installed by each service that needs to make or serve gRPC calls.

---

## Structure

```
proto-contracts/
├── package.json          ← npm package: @myapp/proto-contracts
├── index.js              ← helper to resolve proto file paths
└── proto/
    ├── auth.proto        ← AuthService
    ├── log.proto         ← LogService
    ├── user.proto        ← UserService
    └── payment.proto     ← PaymentService
```

---

## Contracts

### `auth.proto` — AuthService

| RPC | Request | Response |
|---|---|---|
| `RegisterClient` | `RegisterRequest` | `AuthResponse` |
| `LoginClient` | `LoginRequest` | `AuthResponse` |
| `LoginUser` | `LoginRequest` | `AuthResponse` |
| `ValidateToken` | `ValidateRequest` | `ValidateResponse` |
| `CreateToken` | `CreateTokenRequest` | `CreateTokenResponse` |

### `user.proto` — UserService

| RPC | Description |
|---|---|
| `ListUsers` / `RegisterUser` / `UpdateUser` / `DeleteUser` | Back-office user CRUD |
| `ListClients` / `UpdateClient` / `DeleteClient` | Mobile client CRUD |
| `SetCurrency` / `SetBalance` / `AddBalance` / `GetClientBalance` | Account & balance management |

### `log.proto` — LogService

| RPC | Description |
|---|---|
| `WriteLog` | Insert a single audit entry |
| `QueryLogs` | Query entries with filters (actor, date range, action, pagination) |

### `payment.proto` — PaymentService

| RPC | Description |
|---|---|
| `TransferFunds` | Atomic peer-to-peer transfer between two clients |
| `AdminTopUp` | Credit a client's wallet (admin action) |
| `GetBalance` | Return current wallet balance for a client |
| `GetTransactionHistory` | Paginated ledger; omit `client_id` to return all transactions |

---

## Installing in a Service

```bash
npm install file:../proto-contracts
```

Or via `package.json`:

```json
"@myapp/proto-contracts": "file:../proto-contracts"
```

---

## Using Proto Files in Node.js

```js
const protoLoader = require('@grpc/proto-loader');
const path = require('node:path');

const protoPath = path.join(
  __dirname,
  '../node_modules/@myapp/proto-contracts/proto/auth.proto'
);

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
```

---

## When to Update

Update the `.proto` files here when:

- Adding a new gRPC service
- Adding a new RPC method to an existing service
- Changing message fields

After updating, reinstall the package in every affected service:

```bash
npm install file:../proto-contracts
```
- Changing message structure (carefully!)

## Backward Compatibility Rules

Proto3 rules:
- ✅ Adding new optional fields — always OK
- ✅ Removing fields you don't use — OK
- ❌ Changing field numbers — breaks everything
- ❌ Removing fields other services use — breaks those services