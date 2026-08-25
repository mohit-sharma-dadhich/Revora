# Revora

### Autonomous Revenue Growth Agent for Merchants

Revora is an AI-powered revenue growth agent that helps merchants discover and test **cross-sell opportunities**.

It analyzes merchant data, identifies a potential revenue opportunity, proposes a controlled experiment, applies guardrails, executes the experiment using **Razorpay Test Mode**, measures the outcome, and recommends **SCALE / STOP**.

## Core Architecture

```text
Simulated Historical Data
          ↓
      Analytics
          ↓
       AI Agent
    (Reason + Plan)
          ↓
      Guardrails
      ↙       ↘
   BLOCK      PASS
     ↓          ↓
   Audit    Experiment
                ↓
        Razorpay Test Mode
                ↓
         Test Payment
                ↓
      Verification + Webhook
                ↓
        Experiment Results
                ↓
      Incremental Revenue
                ↓
           SCALE / STOP
```

**Core principle:** The LLM reasons. Deterministic code calculates. APIs execute. Guardrails control execution. Audit logs record actions.

> Historical merchant data is simulated for controlled experimentation. Revenue-affecting experiment transactions use Razorpay Test Mode.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **AI:** LLM with tool calling
- **Payments:** Razorpay Test Mode
- **Development:** Git, GitHub, REST APIs
