# Revora Frontend

This frontend is the merchant-facing experience for Revora. It connects the product workflow, opportunity discovery, experiment proposal, results review, and AI recommendations in a single React app.

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
- Opportunity discovery pages
- Experiment design and review screens
- Payment simulation in test mode
- Results and analytics dashboards
- Audit/history views

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

The frontend is intentionally built around a clear product flow: onboard → discover → propose → run → analyze → decide. It keeps the user experience focused while preserving deterministic backend logic under the hood.
