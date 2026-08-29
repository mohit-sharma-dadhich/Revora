const express = require('express');
const cors = require('cors');

const app = express();
const allowedOrigins = new Set([
	process.env.FRONTEND_URL || 'http://localhost:5173',
	'http://localhost:5173',
	'http://localhost:5174',
]);
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));

const webhookRoutes = require('./routes/webhookRoutes');
const healthRoutes = require('./routes/healthRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const experimentRoutes = require('./routes/experimentRoutes');
const experimentLifecycleRoutes = require('./routes/experimentLifecycleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');
const auditRoutes = require('./routes/auditRoutes');
const { attachAuth, requireAuth } = require('./middleware/auth');

// Razorpay webhook verification requires the exact raw bytes from the request body,
// so this route must be registered before the global JSON parser.
app.use('/api', webhookRoutes);
app.use(express.json());
app.use(attachAuth);

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', requireAuth);
app.use('/api', opportunityRoutes);
app.use('/api', experimentRoutes);
app.use('/api', experimentLifecycleRoutes);
app.use('/api', paymentRoutes);
app.use('/api', auditRoutes);

module.exports = app;
