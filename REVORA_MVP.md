# Revora — MVP Specification

## MVP Objective

Build one complete revenue-growth loop for a merchant:

**Discover → Propose → Guardrail → Experiment → Measure → SCALE / STOP**

Revora's first and only MVP strategy is **cross-sell**.

---

## End-to-End Flow

```text
Merchant Data
     ↓
Analytics
     ↓
AI Agent discovers opportunity
     ↓
AI proposes cross-sell experiment
     ↓
Guardrails validate proposal
     ↓
Experiment runs
     ↓
Razorpay Test Mode handles experiment payments
     ↓
Payments are verified and recorded
     ↓
Control vs Treatment is measured
     ↓
Incremental revenue is calculated
     ↓
AI recommends SCALE / STOP
```

---

## 1. Input Data

Historical merchant data is simulated and contains:

- Customers
- Products
- Historical orders
- Purchase relationships

The simulator will contain a measurable cross-sell opportunity, but the opportunity will **not** be directly revealed to the AI.

Example:

```text
Customers who buy Running Shoes
frequently also buy Sports Socks.
```

Revora must discover this relationship through its analytics tools.

---

## 2. AI Agent

The AI agent is responsible for:

- Understanding the merchant's revenue goal
- Selecting relevant tools
- Analyzing returned evidence
- Identifying a cross-sell opportunity
- Explaining why the opportunity is valuable
- Proposing an experiment
- Interpreting experiment results
- Recommending SCALE or STOP

The AI does **not** perform financial calculations itself.

---

## 3. Experiment

The selected audience is divided into:

```text
Eligible Customers
       │
       ├──────────────┐
       ↓              ↓
   CONTROL         TREATMENT
       │              │
 Normal experience   Cross-sell
                    intervention
```

The treatment group receives the proposed cross-sell experience.

The control group does not.

The experiment is executed using **Razorpay Test Mode** for experiment-related transactions.

---

## 4. Guardrails

Before execution, the experiment must pass predefined rules.

Initial guardrails:

- Maximum audience exposure
- Minimum audience/sample size
- Maximum discount
- Minimum expected opportunity

The result is:

```text
PASS → Experiment can execute
BLOCK → Experiment cannot execute
```

A blocked action must include a reason and be recorded in the audit trail.

---

## 5. Razorpay Integration

Revora uses Razorpay Test Mode for the experiment payment flow:

```text
Revora Backend
      ↓
Create Razorpay Order
      ↓
Razorpay Checkout
      ↓
Test Payment
      ↓
Server-side Verification
      ↓
Webhook
      ↓
Experiment Result
```

Razorpay credentials remain server-side.

The AI agent does not directly access Razorpay credentials or payment APIs.

---

## 6. Measurement

Revora compares control and treatment performance.

Primary metric:

**Incremental Revenue per Eligible Customer**

Secondary metrics:

- Conversion rate
- Average order value
- Total revenue
- Revenue uplift

All financial calculations are performed by deterministic application code.

---

## 7. Final Decision

After the experiment, Revora evaluates the measured results.

```text
Experiment Results
       ↓
Incremental Revenue
       ↓
Decision
   ↙       ↘
SCALE     STOP
```

### SCALE

The experiment produced sufficient positive impact according to predefined decision rules.

### STOP

The experiment did not produce sufficient positive impact or failed the required conditions.

The decision and supporting evidence are recorded in the audit trail.

---

## MVP Boundary

### We are building

- One merchant scenario
- One cross-sell strategy
- One AI agent
- Simulated historical data
- Deterministic analytics
- One control/treatment experiment
- Guardrails
- Razorpay Test Mode integration
- Payment verification
- Webhook handling
- Incremental revenue measurement
- SCALE / STOP decision
- Audit trail

### We are NOT building

- Multiple growth strategies
- Multi-agent orchestration
- Production payments
- Complex machine-learning models
- Fully autonomous unrestricted financial actions
- Large-scale statistical research

---

## Core Engineering Rule

> **The LLM reasons. Deterministic code calculates. APIs execute. Guardrails control execution. Audit logs record actions.**
