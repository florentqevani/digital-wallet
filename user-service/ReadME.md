# User Service

gRPC microservice for role management, user CRUD, and client CRUD.

## What It Does

- **ListUsers** — List all back-office users with their roles
- **RegisterUser** — Create a new back-office user with a specified role (`user` or `superadmin`)
- **UpdateUser** — Update a user's email, name, role, or password
- **DeleteUser** — Remove a back-office user
- **ListClients** — List all mobile app clients
- **UpdateClient** — Update a client's email, name, or password
- **DeleteClient** — Remove a mobile app client

> Role data is owned by this service. Roles and permissions are embedded into JWTs by Auth Service at login time.

Audit events for mutating operations are published fire-and-forget to the `service-logs` RabbitMQ queue.

## Local Development

### Setup

```bash
npm install
cp .env.example .env
# Edit .env with your database URL and log service address
```

### Run

```bash
npm start
# Or with auto-reload:
npm run dev
```

### With Docker Compose

```bash
docker-compose up user-service
```

## Database

Uses PostgreSQL (`auth_db`). Tables:
- `users` — back-office users with role `user` or `superadmin`
- `clients` — mobile app users

## Configuration

| Variable | Description | Default |
|---|---|---|
| `PORT` | gRPC listen port | `50053` |
| `HEALTH_PORT` | HTTP health endpoint port | `15053` |
| `AUTH_DB_URL` | PostgreSQL connection string | required |
| `LOG_SERVICE_URL` | Log service gRPC address | `localhost:50052` |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://app:secret@rabbitmq:5672` |

## Dependencies

- `@grpc/grpc-js` — gRPC server
- `bcrypt` — password hashing
- `amqplib` — RabbitMQ publisher (audit log events)
- `pg` — PostgreSQL driver
- `dotenv` — environment variable management
