# Payment Service

> Part of the [GRPC App](../README.md) platform.

gRPC microservice that integrates with the **RaiAccept** payment gateway. It manages the full payment lifecycle: creating a hosted checkout session and confirming payment status.

---

## Responsibilities

- Authenticate with the RaiAccept API and obtain a session token
- Create a payment order and checkout session, returning a redirect URL
- Confirm the status of an existing order by its RaiAccept order ID
- Write audit log entries to Log Service after payment events

---

## gRPC Port

| Context | Port |
|---|---|
| Internal Docker network | `50055` |

---

## RPC Methods (`payment.proto`)

| Method | Description |
|---|---|
| `InitiatePayment` | Authenticate with RaiAccept, create an order + payment session. Returns `payment_form_url` and `rai_order_id`. |
| `ConfirmPayment` | Query the RaiAccept order status by `rai_order_id`. Returns whether the payment succeeded. |

---

## Payment Flow

```
Mobile BFF
  └─► API Gateway POST /api/payments/initiate
            │
            ▼
    PaymentService.InitiatePayment (gRPC)
            │
            ▼
    1. Authenticate with RaiAccept → get token
    2. Create order entry
    3. Create payment session → get paymentRedirectURL
            │
            ▼
    Returns { payment_form_url, rai_order_id }
            │
            ▼
    Flutter opens WebView on payment_form_url
    User completes card payment
    WebView intercepts success callback URL
            │
            ▼
  Mobile BFF POST /api/payments/confirm
            │
            ▼
    PaymentService.ConfirmPayment (gRPC)
            │
            ▼
    1. Authenticate with RaiAccept → get token
    2. Get order details → check status (SUCCESS / PAID)
    3. Write audit log
            │
            ▼
    API Gateway calls UserService.AddBalance (if confirmed)
```

---

## RaiAccept Integration (`src/raiAccept.js`)

Handles:

- `authenticate()` — POST credentials, return bearer token
- `createOrderEntry(token, payload)` — create the order
- `createPaymentSession(token, orderId, payload)` — open a checkout session, return `paymentRedirectURL`
- `getOrderDetails(token, orderId)` — fetch current order status

---

## Logging

After `ConfirmPayment`, an audit entry is written via `log-client.js` to Log Service:

- `action: PAYMENT_COMPLETED`
- `status: SUCCESS` or `ERROR`
- `actor_id: client_id`
- `actor_type: client`

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | gRPC listen port | `50055` |
| `LOG_SERVICE_URL` | Log service gRPC address | `localhost:50052` |
| `RAIACCEPT_USERNAME` | RaiAccept merchant username | — |
| `RAIACCEPT_PASSWORD` | RaiAccept merchant password | — |

---

## Local Development

```bash
cd payment-service
npm install
cp .env.example .env
# Edit .env — set RAIACCEPT_USERNAME, RAIACCEPT_PASSWORD, LOG_SERVICE_URL
npm start
```

With Docker Compose (recommended):

```bash
docker compose up payment-service
```
