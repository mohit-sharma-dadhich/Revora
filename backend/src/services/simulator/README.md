# Merchant Data Simulator

This folder contains the historical merchant dataset generator for Revora.

## Purpose

The simulator creates deterministic, realistic merchant data for future analytics and experimentation. It only creates the merchant's historical world and does not perform analytics, AI reasoning, experiment logic, or payment calculations.

## What it generates

- Customers
- Products
- Historical orders
- Aggregate customer totals derived from generated order history

## Determinism

The simulator accepts a configurable random seed, so the same seed produces the same dataset.

Environment variables used by the simulator:

```env
MONGODB_URI=mongodb://localhost:27017/revora
SEED_RANDOM_SEED=42
SEED_CUSTOMER_COUNT=500
SEED_ORDER_COUNT=4000
SEED_RESET=true
```

## Reset / reseed behavior

The simulator refuses to silently append duplicate data. Use the reset flag to clear the current simulated collections before reseeding.

## Run the simulator

From the backend folder:

```bash
npm run seed
```

To reset and reseed:

```bash
npm run seed -- --reset
```

## Notes

- All monetary values are stored as integer paise.
- Historical orders use `source: 'historical'` and `status: 'completed'`.
- The dataset intentionally hides the planted cross-sell pattern inside generated purchase behavior rather than storing explicit relationship metadata.
