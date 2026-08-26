const express = require('express');

const app = express();

app.use(express.json());

const healthRoutes = require('./routes/healthRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const experimentRoutes = require('./routes/experimentRoutes');
const experimentLifecycleRoutes = require('./routes/experimentLifecycleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

app.use('/api', healthRoutes);
app.use('/api', opportunityRoutes);
app.use('/api', experimentRoutes);
app.use('/api', experimentLifecycleRoutes);
app.use('/api', paymentRoutes);

module.exports = app;
