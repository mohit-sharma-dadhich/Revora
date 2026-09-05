# Revora

Revora is an AI-assisted revenue growth platform for merchants. It discovers cross-sell opportunities from merchant order data, ranks them deterministically, runs guardrail-checked experiments with real control/treatment splits, processes test-mode payments, measures results with a two-proportion z-test, and produces a SCALE/STOP/INSUFFICIENT_DATA decision.

Live app: https://revora.sharmamohit82900.workers.dev/

## What Revora does

- Discovers cross-sell opportunities from customer purchase patterns and ranks them by affinity × audience size
- Supports three data-source modes: demo (shared seeded baseline), private (merchant's own CSV-imported data, fully isolated), and auto (shows the merchant's own data if available, falls back to demo otherwise)
- If a merchant's own data doesn't clear the opportunity thresholds (20+ customers on a base product, 65%+ co-purchase overlap), the app says so explicitly with the actual numbers rather than silently substituting demo data
- Generates an AI recommendation for the top opportunity; recommendations for alternate opportunities are loaded on demand, not automatically, to control LLM cost
- Proposes experiments with guardrail validation and a seeded Fisher-Yates control/treatment split
- Runs experiment payment flows through Razorpay in test mode
- Measures results with a genuine two-proportion z-test — not just "revenue went up"
- Produces a SCALE / STOP / INSUFFICIENT_DATA decision based on the statistical evidence
- A running experiment can be scaled (grows the audience within an exposure cap), ended (with two-step confirmation), or left running to accumulate more data
- Re-analysis is rate-limited: at least one new completed order in either group since the last analysis is required, to prevent re-running statistics on unchanged data
- Completed experiments appear in a History page with their final verdicts and stored measurements
- Every payment transaction gets its own step-by-step audit timeline (order created → client verified / webhook captured → final status), separate from the general system activity log

## Product flow

```text
Merchant data (import or demo)
        ↓
Opportunity discovery (auto/private/demo scoped)
        ↓
AI recommendation + evidence
        ↓
Experiment proposal + guardrail checks
        ↓
Start experiment (seeded random control/treatment split)
        ↓
Simulated customer payments (Razorpay test mode)
        ↓
Analyze (rate-limited re-analysis, real z-test)
        ↓
SCALE / STOP / INSUFFICIENT_DATA decision
        ↓
Scale, continue, or end the experiment
        ↓
Experiment history + per-payment audit trail
```

## Tech stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express
- Data layer: MongoDB with Mongoose
- Auth: hashed bearer session token mapped to a Session document
- Payments: Razorpay in test mode
- AI layer: LLM-powered recommendation and explanation text — never recalculates guardrails, metrics, or financial figures (those are always deterministic code)
- Monitoring: system activity log + per-payment audit timelines + experiment history

## Repository structure

```text
Revora/
├── backend/
│   ├── src/
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── src/
│   ├── package.json
│   └── README.md
├── README.md
├── REVORA_MVP.md
├── e2e-test.ps1
└── csv-validation/
```

## Live environment

- Frontend app: https://revora.sharmamohit82900.workers.dev/

## Local setup

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

The backend exposes the API used by the frontend for auth, opportunities, experiments, audit history, and payments.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment variables

### Backend

Create a local `.env` file in the backend folder (see `backend/.env.example`):

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/revora
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend

The frontend reads the API base URL from Vite environment config:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Core product behavior

### Opportunity discovery

Revora evaluates opportunities using one of three data-source modes:

- **demo**: shared seeded baseline data, always available for exploring the product with no setup
- **private**: a signed-up merchant's own CSV-imported customers, products, and orders, completely isolated from other merchants
- **auto** (default): shows the merchant's own data if they have any, falls back to demo otherwise

If a merchant's own data doesn't meet the qualification thresholds (20+ base customers, 65%+ co-purchase affinity), the app reports the actual numbers explicitly rather than silently falling back to demo data.

### Experiment logic

The app proposes a controlled cross-sell experiment and enforces guardrails before execution. The flow includes:

- Seeded Fisher-Yates audience split into control and treatment groups
- Guardrail validation checks before the experiment can start
- Experiment start, run, and rate-limited re-analysis
- Payment simulation through Razorpay in test mode
- Measurement via two-proportion z-test
- SCALE / STOP / INSUFFICIENT_DATA decision
- Scaling (audience growth within an exposure cap), ending (two-step confirmation), or continuing

### Auditability

Two separate audit surfaces:

- **System activity log**: records experiment lifecycle events, data actions, and operational activity
- **Per-payment audit timeline**: each payment transaction has its own step-by-step trail (order created → client verified / webhook captured → final status)

## Scripts

### Backend

```bash
npm run dev
npm start
npm test
npm run seed    # seed the database with simulated merchant data
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## Notes

This project is an MVP-grade product experience for revenue-optimization workflows, combining deterministic analytics with AI-generated recommendations while keeping guardrails, metrics, financial figures, and decision logic grounded in application code instead of LLM output.
