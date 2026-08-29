const { getRunById, getLatestRun } = require('../services/agent/agentRunService');

async function getAgentRun(req, res) {
  try {
    const { id } = req.params;
    if (!req.auth) return res.status(401).json({ success: false, error: 'A valid session is required.' });
    const ownerId = req.auth.mode === 'live' ? req.auth.user.id : null;
    const sessionId = req.auth.mode === 'test' ? req.auth.sessionId : null;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Agent run ID is required.',
      });
    }
    
    const run = await getRunById(id, ownerId, sessionId);
    
    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Agent run not found.',
      });
    }
    
    return res.status(200).json({
      success: true,
      data: run,
    });
  } catch (error) {
    console.error('Error fetching agent run:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

async function getLatestAgentRun(req, res) {
  try {
    const { runType } = req.query;
    if (!req.auth) return res.status(401).json({ success: false, error: 'A valid session is required.' });
    const ownerId = req.auth.mode === 'live' ? req.auth.user.id : null;
    const sessionId = req.auth.mode === 'test' ? req.auth.sessionId : null;
    
    if (!runType) {
      return res.status(400).json({
        success: false,
        error: 'runType query parameter is required.',
      });
    }
    
    const run = await getLatestRun(runType, ownerId, sessionId);
    
    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'No agent run found for the specified runType.',
      });
    }
    
    return res.status(200).json({
      success: true,
      data: run,
    });
  } catch (error) {
    console.error('Error fetching latest agent run:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  getAgentRun,
  getLatestAgentRun,
};
