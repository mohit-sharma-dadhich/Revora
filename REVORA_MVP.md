# Revora MVP / Product Spec

This document reflects the current implementation and product direction of Revora as it exists today.

Live app: https://revora.sharmamohit82900.workers.dev/

## Objective

Revora helps merchants discover and validate cross-sell opportunities that can increase revenue without relying on blind automation. The product combines deterministic evidence, AI explanation, and experiment guardrails to support smarter decision-making.

## Current user journey

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

## What is implemented

### Opportunity intelligence

- Merchant data (customers, products, orders) can be imported via CSV or explored using a shared seeded demo dataset
- Opportunity discovery supports three data-source modes: `demo`, `private`, and `auto` (default)
- The system ranks opportunities deterministically by co-purchase affinity × audience size
- Qualification thresholds are enforced: 20+ customers on a base product and 65%+ co-purchase overlap with a second product
- If a merchant's own data doesn't clear these thresholds, the app reports the actual numbers explicitly rather than silently substituting demo data

### AI layer

- An AI-generated recommendation is provided for the top-ranked opportunity
- Recommendations for alternate opportunities are loaded on demand, not automatically, to control LLM cost
- The AI layer only explains and recommends — it never recalculates guardrails, metrics, or financial figures; those are always deterministic code

### Experiment workflow

- A proposed experiment is created from a selected opportunity
- Guardrails validate whether the experiment should run (audience size, opportunity quality, maximum exposure)
- Audience groups are split into control and treatment cohorts using a seeded Fisher-Yates shuffle
- Running experiments can be analyzed for outcomes using a two-proportion z-test
- Re-analysis is rate-limited: at least one new completed order in either group since the last analysis is required, preventing re-running statistics on unchanged data
- Analysis produces a SCALE / STOP / INSUFFICIENT_DATA decision
- A running experiment can be scaled (grows the audience within an exposure cap), ended (with a two-step confirmation), or left running to accumulate more data
- Completed experiments appear in a History page with their final verdicts and stored measurement data

### Payment and simulation

- Razorpay in test mode is used for simulating customer payments
- Payment flows are verified server-side (client verification and webhook capture)
- Each payment transaction gets its own step-by-step audit timeline (order created → client verified / webhook captured → final status)
- This per-payment audit trail is separate from the general system activity log

### Auditability

- Experiment lifecycle events and data actions are recorded in the system activity log
- Each payment has an independent audit timeline with granular step tracking
- Results, metrics, and decision logic remain inspectable and deterministic

## Data source model

The app supports three data-source modes:

- **`demo`**: uses a shared seeded baseline dataset, always available for exploring the product with no setup
- **`private`**: uses the merchant's own CSV-imported customers, products, and orders, completely isolated from other merchants
- **`auto`** (default): shows the merchant's own data if they have any, falls back to demo otherwise

If a merchant's private data doesn't meet the qualification thresholds, the app surfaces the actual numbers (base customer count, measured affinity) and explains why no opportunity qualified, rather than silently falling back to demo data.

## Guardrails and decisioning

Before an experiment is run, the system validates that it is safe and meaningful:

- Audience size constraints (minimum eligible customers)
- Minimum opportunity quality (affinity threshold)
- Maximum exposure rules (cap on the fraction of eligible customers in the experiment)
- Experiment-specific checks and block reasons

After analysis, the decision is based on statistical evidence from a two-proportion z-test, not just revenue comparison. The possible outcomes are:

- **SCALE**: statistically significant positive result
- **STOP**: evidence of no benefit or negative impact
- **INSUFFICIENT_DATA**: not enough evidence to decide yet

## Engineering principle

> The LLM explains the signal. Deterministic code calculates the signal. The application executes and records the decision.

## MVP boundary

The product is intentionally scoped to a merchant-facing revenue optimization loop focused on cross-sell opportunities, not a general autonomous trading or marketing engine.

## Current project status

This repository represents the current working build of Revora, including:

- Frontend experience and navigation
- Backend API and services
- Experiment lifecycle support (propose, start, analyze, scale, end)
- AI recommendation with cost-controlled on-demand loading
- Payment test-mode flow with per-payment audit timelines
- Deterministic analytics and measurement (two-proportion z-test)
- Experiment history page
- System activity log and payment audit views

## Local development

See the root [README.md](README.md), [backend/README.md](backend/README.md), and [frontend/README.md](frontend/README.md) for setup and run instructions.
