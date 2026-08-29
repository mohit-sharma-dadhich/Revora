const express = require('express');
const { getAgentRun, getLatestAgentRun } = require('../controllers/agentRunController');

const router = express.Router();

router.get('/agent-runs/:id', getAgentRun);
router.get('/agent-runs/latest', getLatestAgentRun);

module.exports = router;
