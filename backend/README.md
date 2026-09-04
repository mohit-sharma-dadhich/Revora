# Revora Backend

This backend powers the Revora application: auth, opportunity discovery, experiment lifecycle management, recommendations, payment flows, and audit logging.

## Stack

- Node.js
- Express
- MongoDB with Mongoose
- JWT/session auth
- Razorpay SDK
- REST API endpoints for frontend consumption

## Local setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend folder:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/revora
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
JWT_SECRET=your_local_secret
```

Start the server:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## API shape

The backend exposes endpoints for:

- auth and session creation
- merchant/imported data flow
- opportunity discovery and listing
- AI recommendation calls
- experiment proposal, start, and analysis
- payment order creation and verification
- audit log retrieval
- health checks

## Health check

```bash
curl http://localhost:5000/health
```

Expected response is a success envelope indicating the server is live.

## Important backend responsibilities

- Calculate and serve opportunities using deterministic logic
- Maintain the source-of-truth data for experiments and payments
- Enforce access/session validation
- Support audit logging for evidence and actions
- Keep Razorpay keys on the server, never in client code

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

The backend is the operational core of the product and is responsible for turning signal generation, experiment execution, and measurement into a reliable merchant workflow.
