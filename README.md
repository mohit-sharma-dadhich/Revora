# Revora

Revora is an AI-assisted revenue growth platform for merchants. It discovers high-signal cross-sell opportunities from merchant order data, validates them with deterministic analytics, runs guarded experiments, and surfaces actionable recommendations to grow incremental revenue.

Live app: https://revora.sharmamohit82900.workers.dev/

## What Revora does

- Identifies cross-sell opportunities from customer purchase patterns
- Supports demo, private, and auto data-source modes
- Uses deterministic analytics to score and rank opportunities
- Generates AI analysis and recommendation text for each opportunity
- Proposes experiments with guardrail validation
- Runs experiment simulation and payment flows in Razorpay Test Mode
- Measures results, records audits, and provides a scale/stop decision

## Latest product flow

```text
Merchant data / imports
        ↓
Opportunity discovery
        ↓
AI recommendation + evidence
        ↓
Experiment proposal
        ↓
Guardrail checks
        ↓
Start experiment
        ↓
Simulated customer payments
        ↓
Result analysis
        ↓
SCALE / STOP recommendation
```

## Tech stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express
- Data layer: MongoDB with Mongoose
- AI layer: LLM-powered recommendation and reasoning
- Payments: Razorpay Test Mode
- Auth: session-based merchant auth flow
- Monitoring: audit logs and experiment history

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

Create a local `.env` file in the backend folder with values like:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/revora
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
JWT_SECRET=your_local_secret
```

### Frontend

The frontend reads the API base URL from Vite environment config:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Core product behavior

### Opportunity discovery

Revora can evaluate opportunities using:

- `demo` data
- `private` uploaded/merchant-provided data
- `auto` mode for default behavior when no explicit override is set

### Experiment logic

The app proposes a controlled cross-sell experiment and enforces guardrails before execution. The flow includes:

- audience split and control/treatment allocation
- validation checks
- experiment start and run status
- payment simulation in test mode
- measurement and final decisioning

### Auditability

The system records experiment, payment, and operation activity to keep the workflow traceable and explainable.

## Scripts

### Backend

```bash
npm run dev
npm start
npm test
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## Notes

This project is an MVP-grade product experience for revenue-optimization workflows, combining deterministic analytics with AI-generated recommendations while keeping the actual decision logic grounded in application data instead of raw LLM output.
