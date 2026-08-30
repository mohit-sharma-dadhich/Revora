const {
  proposeExperiment: proposeExperimentForOpportunity,
  createProposalFromBestOpportunity,
  normalizeOptions,
} = require('../services/experiments/experimentProposalService');

async function proposeExperiment(req, res) {
  try {
    const normalizedOptions = normalizeOptions({
      minEligibleAudience: req.query.minEligibleAudience,
      maxExposurePercent: req.query.maxExposurePercent,
      treatmentPercent: req.query.treatmentPercent,
      strategy: req.query.strategy,
    });

    const result = req.body && req.body.opportunity
      ? await proposeExperimentForOpportunity({
          opportunity: req.body.opportunity,
          ...normalizedOptions,
          auth: req.auth,
        })
      : await createProposalFromBestOpportunity({
          ...normalizedOptions,
          auth: req.auth,
        });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  proposeExperiment,
};
