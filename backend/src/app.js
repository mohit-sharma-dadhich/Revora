const express = require('express');

const app = express();

app.use(express.json());

const healthRoutes = require('./routes/healthRoutes');
app.use('/api', healthRoutes);

module.exports = app;
