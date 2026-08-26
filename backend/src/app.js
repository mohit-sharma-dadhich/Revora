const express = require('express');

const app = express();

const webhookRoutes = require('./routes/webhookRoutes');
const healthRoutes = require('./routes/healthRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const experimentRoutes = require('./routes/experimentRoutes');
const experimentLifecycleRoutes = require('./routes/experimentLifecycleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Razorpay webhook verification requires the exact raw bytes from the request body,
// so this route must be registered before the global JSON parser.
app.use('/api', webhookRoutes);
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', opportunityRoutes);
app.use('/api', experimentRoutes);
app.use('/api', experimentLifecycleRoutes);
app.use('/api', paymentRoutes);

module.exports = app;
