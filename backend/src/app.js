const express = require('express');
const cors = require('cors');

const app = express();
const allowedOrigins = new Set(
	[
		process.env.FRONTEND_URL,
		'http://localhost:5173',
		'http://localhost:5174',
	].filter(Boolean).map((value) => String(value).replace(/\/$/, ''))
);

function normalizeOrigin(value) {
	return String(value || '').replace(/\/$/, '');
}

function isAllowedOrigin(origin) {
	const normalizedOrigin = normalizeOrigin(origin);
	if (!normalizedOrigin) return true;
	if (allowedOrigins.has(normalizedOrigin)) return true;
	return /^https?:\/\/localhost(?::\d+)?$/.test(normalizedOrigin)
		|| /^https:\/\/[-a-z0-9]+\.pages\.dev$/i.test(normalizedOrigin)
		|| /^https:\/\/[-a-z0-9]+\.workers\.dev$/i.test(normalizedOrigin);
}

app.use(cors({
	origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
}));

const webhookRoutes = require('./routes/webhookRoutes');
const healthRoutes = require('./routes/healthRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const experimentRoutes = require('./routes/experimentRoutes');
const experimentLifecycleRoutes = require('./routes/experimentLifecycleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');
const auditRoutes = require('./routes/auditRoutes');
const importRoutes = require('./routes/importRoutes');
const agentRunRoutes = require('./routes/agentRunRoutes');
const { attachAuth, requireAuth } = require('./middleware/auth');

// Razorpay webhook verification requires the exact raw bytes from the request body,
// so this route must be registered before the global JSON parser.
app.use('/api', webhookRoutes);
app.use(express.json());
app.use(attachAuth);
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, private');
  next();
});

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', requireAuth);
app.use('/api', opportunityRoutes);
app.use('/api', experimentRoutes);
app.use('/api', experimentLifecycleRoutes);
app.use('/api', paymentRoutes);
app.use('/api', auditRoutes);
app.use('/api', importRoutes);
app.use('/api', agentRunRoutes);

module.exports = app;
