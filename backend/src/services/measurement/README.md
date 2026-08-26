# Experiment Measurement

This service layer is a deterministic, read-only measurement boundary for experiment performance.

The application uses it to compute the financial impact of an experiment without touching the experiment lifecycle or performing any AI reasoning.

## What this layer measures

- control and treatment conversion rates
- revenue per customer in each group
- total paid revenue for the experiment audience
- average order value for converted customers
- incremental revenue lift between treatment and control

## Important constraints

- This layer does not write to the database.
- This layer does not trigger any LLM reasoning.
- This layer does not complete or start experiments.
- This layer only reads Experiment and Order documents and computes deterministic financial metrics.

## Source of truth

The measurement is derived from the Application's Experiment and Order data:

- experimentId
- experimentGroup
- customerId
- status
- amount
- targetProductId

This is intentionally deterministic and auditable. The AI system is not involved in the values or calculations here.
