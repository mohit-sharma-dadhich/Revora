# Revora Backend

This backend powers the Revora application: auth, opportunity discovery, experiment lifecycle management, AI recommendations, payment flows, and audit logging.

## Stack

- Node.js
- Express
- MongoDB with Mongoose
- Hashed bearer session token auth (mapped to a Session document)
- Razorpay SDK (test mode)
- REST API endpoints for frontend consumption

## Local setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend folder (see `.env.example`):

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

Start the server:

```bash
npm run dev
```

Seed the database with simulated merchant data:

```bash
npm run seed
```

Production mode:

```bash
npm start
```

## API shape

The backend exposes endpoints for:

- Auth and session creation (hashed bearer tokens, not JWT)
- Merchant data import (CSV upload for customers, products, orders)
- Opportunity discovery and listing (demo / private / auto scoping)
- AI recommendation generation (on-demand, cost-controlled)
- Experiment proposal, start, analysis, scaling, and ending
- Payment order creation and verification (Razorpay test mode)
- Per-payment audit timeline retrieval
- System activity log retrieval
- Health checks

## Health check

```bash
curl http://localhost:5000/health
```

Expected response is a success envelope indicating the server is live.

## Important backend responsibilities

- Calculate and serve opportunities using deterministic logic (affinity × audience size ranking)
- Enforce qualification thresholds (20+ base customers, 65%+ co-purchase affinity) and report actual numbers when data falls short
- Run experiment measurement with a two-proportion z-test and produce SCALE / STOP / INSUFFICIENT_DATA decisions
- Rate-limit re-analysis to require at least one new completed order in either group since the last analysis
- Maintain the source-of-truth data for experiments and payments
- Record per-payment step-by-step audit timelines (order created → client verified / webhook captured → final status)
- Enforce session validation via hashed bearer tokens
- Keep Razorpay keys and webhook secrets on the server, never in client code
- Ensure the AI layer only explains and recommends — guardrails, metrics, and financial figures are always deterministic code

## Project structure

```text
backend/
├── src/
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── server.js
├── package.json
└── README.md
```

## Notes

The backend is the operational core of the product and is responsible for turning signal generation, experiment execution, and measurement into a reliable merchant workflow. All guardrails, metrics, financial figures, and decisions are computed in deterministic application code — the LLM layer is restricted to explanation and recommendation text.
