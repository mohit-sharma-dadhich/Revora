const {
  getExperimentById,
  startExperiment: startExperimentService,
  analyzeExperiment: analyzeExperimentService,
  scaleExperiment: scaleExperimentService,
  endExperiment: endExperimentService,
} = require('../services/experiments/experimentLifecycleService');

async function getExperiment(req, res) {
  try {
    const experiment = await getExperimentById(req.params.id, req.auth);

    return res.status(200).json({
      success: true,
      data: experiment,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      error: error.message,
    });
  }
}

async function startExperiment(req, res) {
  try {
    const experiment = await startExperimentService(req.params.id, req.auth);

    return res.status(200).json({
      success: true,
      data: experiment,
    });
  } catch (error) {
    const statusCode = error.message === 'Experiment not found.' ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
}

async function analyzeExperiment(req, res) {
  try {
    const experiment = await analyzeExperimentService(req.params.id, req.auth);

    return res.status(200).json({
      success: true,
      data: experiment,
    });
  } catch (error) {
    if (error.message.startsWith('Need at least 1 new paid experiment order')) {
      return res.status(429).json({
        success: false,
        error: error.message,
        code: 'ANALYSIS_RATE_LIMITED',
      });
    }

    const statusCode = error.message === 'Experiment not found.' ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
}

async function scaleExperiment(req, res) {
  try {
    const experiment = await scaleExperimentService(req.params.id, req.body || {}, req.auth);

    return res.status(200).json({
      success: true,
      data: experiment,
    });
  } catch (error) {
    const statusCode = error.message === 'Experiment not found.' ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
}

async function endExperiment(req, res) {
  try {
    const experiment = await endExperimentService(req.params.id, req.auth);

    return res.status(200).json({
      success: true,
      data: experiment,
    });
  } catch (error) {
    const statusCode = error.message === 'Experiment not found.' ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  analyzeExperiment,
  endExperiment,
  getExperiment,
  scaleExperiment,
  startExperiment,
};
