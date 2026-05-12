# Web Frontend

> Part of the [GRPC App](../README.md) platform.

React back-office SPA (Vite + React Router). Provides the interface for back-office users and superadmins to manage users, clients, payments, and audit logs.

---

## How It Connects

All API calls go to the **Web BFF** (`http://localhost:3104` in the Docker stack):

```
React SPA → Web BFF (HTTP :3104) → API Gateway (HTTP :8080) → gRPC services
```

The JWT received at login is stored in `localStorage` and sent as a `Bearer` token on every subsequent request. No gRPC service is ever contacted directly from the browser.

---

## Layout

The app uses a persistent sidebar (`AppShell`) with a collapse/expand toggle. All authenticated pages are nested inside this shell via React Router's layout route pattern. `ProtectedRoute` guards authenticated sections — unauthenticated users are redirected to `/login`, and non-superadmin users are redirected away from superadmin-only pages.

---

## Route Map

| Path                          | Component               | Minimum role |
| ----------------------------- | ----------------------- | ------------ |
| `/login`                      | `LoginPage`             | Public       |
| `/`                           | Redirect → `/dashboard` | —            |
| `/dashboard`                  | `AdminDashboardPage`    | superadmin   |
| `/dashboard/client-logs`      | `ClientLogsPage`        | superadmin   |
| `/dashboard/user-logs`        | `UserLogsPage`          | superadmin   |
| `/dashboard/users`            | `UserManagementPage`    | superadmin   |
| `/dashboard/users/backoffice` | `BackofficeUsersPage`   | superadmin   |
| `/dashboard/users/clients`    | `ClientAccountsPage`    | user         |
| `/payments`                   | `PaymentsPage`          | user         |
| `/payments/topup`             | `TopUpPage`             | user         |
| `/payments/balance`           | `BalancePage`           | user         |
| `/payments/history`           | `HistoryPage`           | user         |
| `/accounts`                   | `AccountsPage`          | superadmin   |
| `/accounts/logs`              | `AccountLogsPage`       | superadmin   |
| `*`                           | `NotFoundPage`          | —            |

### Page Descriptions

| Component             | Description                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `AdminDashboardPage`  | Summary statistics, daily-activity heatmap (14-day window), recent client and user log feeds |
| `ClientLogsPage`      | Filterable audit log for mobile client actions (actor_type: `client`)                        |
| `UserLogsPage`        | Filterable audit log for back-office operator actions (actor_type: `user` / `superadmin`)    |
| `UserManagementPage`  | Redirects to the appropriate user sub-page based on role                                     |
| `BackofficeUsersPage` | CRUD for back-office users (`user` / `superadmin`) — superadmin only                         |
| `ClientAccountsPage`  | View and manage mobile client accounts and balances                                          |
| `PaymentsPage`        | Payment overview and navigation hub                                                          |
| `TopUpPage`           | Admin-initiated client wallet top-up                                                         |
| `BalancePage`         | Real-time balance lookup for a client                                                        |
| `HistoryPage`         | Paginated full transaction ledger (all clients for superadmin, scoped for user)              |
| `AccountsPage`        | View and manage client accounts (create, delete, update status)                              |
| `AccountLogsPage`     | Audit log for account operations (CREATE_ACCOUNT, DELETE_ACCOUNT, UPDATE_ACCOUNT_STATUS)     |

---

## Auth and Role-Based Routing

- `ProtectedRoute` reads the JWT from `localStorage` and decodes it client-side to extract the `role` claim
- Routes guarded with `roles={['superadmin']}` redirect `user` role to the nearest permitted page
- Any 401 response from the Web BFF clears the session and redirects to `/login`

---

## Tech Stack

| Library         | Purpose                                                               |
| --------------- | --------------------------------------------------------------------- |
| React 18        | UI framework                                                          |
| React Router v6 | Client-side routing with layout routes                                |
| Vite 5          | Dev server and build tool                                             |
| Recharts        | Dashboard data charts (removed from heatmap, retained for future use) |

---

## Environment Variables

| Variable           | Description      | Default                 |
| ------------------ | ---------------- | ----------------------- |
| `VITE_WEB_BFF_URL` | Web BFF base URL | `http://localhost:3104` |

---

## Local Development

```bash
cd web-frontend
npm install
npm run dev        # Vite dev server on :5173
```

Set `VITE_WEB_BFF_URL` in a `.env` file if running the BFF on a non-default port or host.

---

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file host or Nginx. Ensure the production host can reach the Web BFF URL set in the build-time environment.
