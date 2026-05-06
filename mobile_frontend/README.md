# Mobile Frontend

> Part of the [GRPC App](../README.md) platform.

Flutter mobile application for end-users (clients). Supports registration, login, balance viewing, activity/transaction history, and peer-to-peer money transfers.

---

## Features

| Screen | Description |
|---|---|
| Register | Create a new client account |
| Login | Authenticate and persist session (JWT in SharedPreferences) |
| Home — Balance Card | Shows "Signed in as [name]", current balance, and Send Money shortcut |
| Home — Activity Tab | Paginated audit log with infinite scroll and pull-to-refresh |
| Home — Transactions Tab | Transfer history with credit/debit colour coding and pull-to-refresh |
| Send Money Dialog | Peer-to-peer transfer by recipient email with inline validation |

---

## How It Connects

All API calls go to the **Mobile BFF** (`http://10.0.2.2:3002` on Android emulator):

```
Flutter app → Mobile BFF (HTTP :3002) → API Gateway (HTTP :8080) → gRPC services
```

The JWT is stored in `SharedPreferences` after login and sent as a `Bearer` token on every subsequent request. The client name is decoded directly from the JWT payload (no extra API call).

---

## Tech Stack

| Package | Purpose |
|---|---|
| `http` | HTTP client for API calls |
| `shared_preferences` | Persistent JWT and session storage |
| `provider` | State management via `AuthController` (ChangeNotifier) |
| `intl` | Date and currency formatting |

---

## State Management

`AuthController` (`lib/features/auth/auth_controller.dart`) is the single source of truth:

- Decodes JWT on login/register to extract `id`, `name`, and `role`
- Exposes `balance`, `currency`, `recentActivity`, `transactions`
- Methods: `login()`, `register()`, `logout()`, `fetchLogs()`, `fetchTransactionHistory()`, `transferFunds()`

---

## Shared Widgets

| Widget | File | Description |
|---|---|---|
| `BalanceCard` | `shared/widgets/balance_card.dart` | Balance + name header card |
| `ActivityTile` | `shared/widgets/activity_tile.dart` | Single audit log entry |
| `TransactionTile` | `shared/widgets/transaction_tile.dart` | Single transaction with +/- styling |
| `EmptyState` | `shared/widgets/empty_state.dart` | Pull-to-refresh compatible empty list |

---

## Base URL Configuration

Set in `lib/core/config/`:

| Environment | Default URL |
|---|---|
| Android emulator | `http://10.0.2.2:3002` |
| Physical device / prod | Override via env or config file |

---

## Features

| Screen | Description |
|---|---|
| Register | Create a new client account |
| Login | Authenticate and persist session |
| Home | View account balance and summary |
| Payment | Initiate a top-up via RaiAccept WebView |
| Logs | View recent account activity |

---

## How It Connects

All API calls go to the **Mobile BFF** (`http://localhost:3002` by default):

```
Flutter app → Mobile BFF (HTTP :3002) → API Gateway (HTTP :8080) → gRPC services
```

The JWT is stored in `SharedPreferences` after login and sent as a `Bearer` token on every subsequent request.

---

## Payment Flow (WebView)

1. App calls `POST /api/payments/initiate` → BFF returns `payment_form_url` and `rai_order_id`
2. App opens a `WebView` on `payment_form_url` (hosted RaiAccept checkout page)
3. `NavigationDelegate` intercepts the callback URL (`http://mobile.callback/success`)
4. WebView is closed; app calls `POST /api/payments/confirm` with `rai_order_id`
5. On success, balance is updated and shown to the user

---

## Tech Stack

| Package | Purpose |
|---|---|
| `http` | HTTP client for API calls |
| `shared_preferences` | Persistent JWT and session storage |
| `webview_flutter` | Embedded browser for RaiAccept checkout |
| `intl` | Date and currency formatting |

---

## Base URL Configuration

The API base URL is set in `lib/core/config/`:

| Environment | Default URL |
|---|---|
| Android emulator | `http://10.0.2.2:3002` |
| Web / desktop | `http://localhost:3002` |

Override via compile-time environment variable `MOBILE_API_BASE_URL` if needed.

---

## Local Development

```bash
cd mobile_frontend
flutter pub get
flutter run -d chrome        # web
flutter run -d emulator-id   # Android emulator
```

To run on a physical Android device, update the base URL to your machine's LAN IP.

---

## Project Structure

```
lib/
├── main.dart
├── core/
│   ├── config/    ← API base URL and app-wide constants
│   ├── network/   ← HTTP client and interceptors
│   ├── storage/   ← SharedPreferences wrapper
│   ├── theme/     ← App theme
│   └── error/     ← Error types
├── features/
│   ├── auth/      ← Register / Login screens and logic
│   ├── home/      ← Home screen
│   ├── payment/   ← Payment initiation and WebView
│   ├── logs/      ← Activity log screen
│   └── register/  ← Registration flow
└── shared/        ← Shared widgets
```
