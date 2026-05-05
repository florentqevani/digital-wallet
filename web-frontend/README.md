# Web Frontend

> Part of the [GRPC App](../README.md) platform.

React back-office SPA (Vite + React Router). Provides the interface for back-office users and superadmins to manage users, clients, and audit logs.

---

## Pages

| Path | Component | Access |
|---|---|---|
| `/` | Redirect to login | — |
| `/login` | `LoginPage` | Public |
| `/dashboard` | `AdminDashboardPage` | superadmin |
| `/user-management` | `UserManagementPage` | superadmin |
| `/accounts` | `AccountsPage` | user / superadmin |
| `/my-logs` | `MyLogsPage` | user / superadmin |
| `*` | `NotFoundPage` | — |

---

## How It Connects

All API calls go to the **Web BFF** (`http://localhost:3104` by default):

```
React SPA → Web BFF (HTTP :3104) → API Gateway (HTTP :8080) → gRPC services
```

The JWT is stored in `localStorage` after login and sent as a `Bearer` token on every subsequent request.

---

## Auth and Role-Based Routing

- `ProtectedRoute` component checks for a valid token in `localStorage`
- Routes guarded by role: `superadmin`-only routes redirect `user` role to `/my-logs`
- On token expiry or 401 response, the app clears session and redirects to `/login`

---

## Tech Stack

| Library | Purpose |
|---|---|
| React 18 | UI framework |
| React Router v6 | Client-side routing |
| Vite 5 | Dev server and build tool |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_WEB_BFF_URL` | Web BFF base URL | `http://localhost:3104` |

---

## Local Development

```bash
cd web-frontend
npm install
# Optional: set VITE_WEB_BFF_URL in .env if BFF runs on a different port
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

npm run build
