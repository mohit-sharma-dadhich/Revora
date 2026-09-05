# Revora Frontend

This frontend is the merchant-facing experience for Revora. It connects opportunity discovery, experiment management, payment simulation, results review, audit timelines, and AI recommendations in a single React app.

Live app: https://revora.sharmamohit82900.workers.dev/

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- React Router

## Local setup

```bash
cd frontend
npm install
npm run dev
```

The app expects the backend API to be available locally or through a hosted environment.

## Environment variables

Create a `.env` file if needed:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Key frontend areas

- Onboarding flow and session setup
- Opportunity discovery with data-source mode awareness (demo / private / auto)
- AI recommendation for the top opportunity; alternate recommendations loaded on demand
- Experiment proposal, guardrail review, and lifecycle management (start, analyze, scale, end)
- Payment simulation through Razorpay in test mode
- Results page with statistical measurement and SCALE / STOP / INSUFFICIENT_DATA verdict
- Experiment history page for completed experiments
- Per-payment audit timeline view (order created → verified → final status)
- System activity log view

## Main pages

- Onboarding
- OpportunityPage
- ExperimentPage
- ResultsPage
- HistoryPage
- AuditPage
- ProfilePage

## Run and build

```bash
npm run dev
npm run build
npm run preview
```

## Notes

The frontend is intentionally built around a clear product flow: onboard → discover → propose → run → analyze → decide. It keeps the user experience focused while preserving deterministic backend logic under the hood. The AI layer surfaces explanation and recommendation text only — guardrails, metrics, and decisions are always computed server-side in deterministic code.
