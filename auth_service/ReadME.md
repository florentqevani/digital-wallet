# Auth Service

gRPC microservice for authentication and token management.

## What It Does

- **RegisterClient** — Register a new mobile app user and return a signed JWT
- **LoginClient** — Authenticate a mobile app user and return a signed JWT
- **LoginUser** — Authenticate a back-office user (regular or super-admin) and return a signed JWT
- **ValidateToken** — Verify a JWT and return the decoded `user_id`, `role`, and `permissions`
- **CreateToken** — Sign and issue a JWT for a given `user_id` and `role` (callable by other internal services)

All issued JWTs embed a `permissions[]` array alongside `role` so downstream services can authorise without additional lookups.

Audit events are published fire-and-forget to the `service-logs` RabbitMQ queue after each login or registration.

## Local Development

### Setup

```bash
npm install
cp .env.example .env
# Edit .env with your database URL and JWT secret
```

### Run

```bash
npm start
# Or with auto-reload:
npm run dev
```

### With Docker Compose

```bash
docker-compose up auth-service
```

## Database

Uses PostgreSQL. Tables:
- `clients` — mobile app users
- `users` — back-office users (with role: 'user' or 'superadmin')

## Configuration

See `.env.example` for all available options.

## Dependencies

- `@grpc/grpc-js` — gRPC server
- `bcrypt` — password hashing
- `jsonwebtoken` — JWT token creation/validation
- `amqplib` — RabbitMQ publisher (audit log events)
- `pg` — PostgreSQL driver
- `dotenv` — environment variable management