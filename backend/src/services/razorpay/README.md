# Razorpay Test Mode foundation

This service layer exists to isolate the Razorpay integration behind a small, deterministic boundary.

The current MVP only needs a minimal set of Razorpay operations for later experiment flows. It is intentionally limited to read-only API communication and order lookup helpers, without creating payment routes, webhooks, or AI-driven logic.

## Supported operations

- createTestOrder(...)
- fetchOrder(...)
- fetchPayment(...)

These methods use the official Razorpay Node SDK instead of direct HTTP requests.

## Required environment variables

Set the following values in your environment before using this service:

- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET

The example file at .env.example contains the required keys.

## Test Mode requirement

This project must use Razorpay Test Mode credentials only. No real customer payments are involved in the MVP stage.

## Important constraints

- All monetary values are integer paise values.
- No database records are created by this layer.
- No API routes, webhook handlers, or frontend integration are included here.
- This layer does not perform AI, experiment, or guardrail logic.
