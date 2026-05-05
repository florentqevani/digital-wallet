# Mobile Frontend

> Part of the [GRPC App](../README.md) platform.

Flutter mobile application for end-users (clients). Supports registration, login, balance/activity viewing, and card payments via an embedded WebView.

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
