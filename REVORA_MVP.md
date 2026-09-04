# Revora MVP / Product Spec

This document reflects the current implementation and product direction of Revora as it exists today.

Live app: https://revora.sharmamohit82900.workers.dev/

## Objective

Revora helps merchants discover and validate cross-sell opportunities that can increase revenue without relying on blind automation. The product combines deterministic evidence, AI explanation, and experiment guardrails to support smarter decision-making.

## Current user journey

```text
Onboarding / session setup
        ↓
Opportunity discovery
        ↓
AI explanation and rank
        ↓
Experiment proposal
        ↓
Guardrail validation
        ↓
Experiment execution
        ↓
Test payment simulation
        ↓
Results review
        ↓
SCALE / STOP recommendation
```

## What is implemented

### Opportunity intelligence

- Merchant data and product history can be imported or simulated
- Opportunity discovery supports `demo`, `private`, and `auto` data sources
- The system ranks opportunities by affinity and audience scale
- The UI can show other opportunities besides the primary one

### AI layer

- The app provides AI recommendation explanations for opportunities
- Recommendation quality is grounded in the actual opportunity object
- The AI layer is not allowed to invent counts or override deterministic metrics

### Experiment workflow

- A proposed experiment is created from a selected opportunity
- Guardrails validate whether the experiment should run
- Audience groups are split across control and treatment cohorts
- Running experiments can be analyzed for outcomes
- Analysis results route to a results page

### Payment and simulation

- Razorpay Test Mode is used for test payment simulation
- Payment flows are verified server-side
- Customer-level payment simulation is supported in the UI

### Auditability

- Experiment flows and data actions are recorded in the app audit trail
- Results and recommendation logic remain inspectable and deterministic

## Data source model

The app supports three data-source modes:

- `demo`: uses seeded/demo data
- `private`: uses merchant uploaded or private data
- `auto`: default fallback mode when no explicit override is set

The company logic intentionally keeps explicit user override buttons in onboarding, while the default page behavior falls back to `auto` instead of `demo`.

## Guardrails and decisioning

Before an experiment is run, the system validates that it is safe and meaningful. Some examples include:

- audience size constraints
- minimum opportunity quality
- maximum exposure rules
- experiment-specific checks and block reasons

## Engineering principle

> The LLM explains the signal. Deterministic code calculates the signal. The application executes and records the decision.

## MVP boundary

The product is intentionally scoped to a merchant-facing revenue optimization loop focused on cross-sell opportunities, not a general autonomous trading or marketing engine.

## Current project status

This repository represents the current working build of Revora, including:

- frontend experience and navigation
- backend API and services
- experiment lifecycle support
- AI recommendation support
- payment test-mode flow
- analytics and measurement logic

## Local development

See the root [README.md](README.md), [backend/README.md](backend/README.md), and [frontend/README.md](frontend/README.md) for setup and run instructions.
