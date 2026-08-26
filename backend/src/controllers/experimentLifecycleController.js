const {
  getExperimentById,
  startExperiment: startExperimentService,
  completeExperimentWithMeasurement,
} = require('../services/experiments/experimentLifecycleService');

async function getExperiment(req, res) {
  try {
    const experiment = await getExperimentById(req.params.id);

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
    const experiment = await startExperimentService(req.params.id);

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

async function completeExperiment(req, res) {
  try {
    const experiment = await completeExperimentWithMeasurement(req.params.id, req.body || {});

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
  completeExperiment,
  getExperiment,
  startExperiment,
};
