# Revora Backend

This is the backend foundation for Revora, built with Node.js, Express.js, and MongoDB via Mongoose.

## Prerequisites

- Node.js 18+
- MongoDB running locally or a MongoDB connection string

## Installation

```bash
cd backend
npm install
```

## Environment configuration

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Update the variables in `.env` as needed:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/revora
```

## Start the server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Health check

Once the server is running, verify the health endpoint:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Revora backend is running",
  "timestamp": "2026-08-26T12:00:00.000Z"
}
```

## Notes

- This is intentionally a minimal backend foundation.
- The app is ready for future route, controller, service, and model expansion.
- No real `.env` file is included in the repository.
