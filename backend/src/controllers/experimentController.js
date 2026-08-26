const { createProposalFromBestOpportunity } = require('../services/experiments/experimentProposalService');

async function proposeExperiment(req, res) {
  try {
    const minEligibleAudience = Number(req.query.minEligibleAudience || 20);
    const maxExposurePercent = Number(req.query.maxExposurePercent || 0.2);
    const treatmentPercent = Number(req.query.treatmentPercent || 0.5);
    const strategy = req.query.strategy || 'CROSS_SELL';

    const result = await createProposalFromBestOpportunity({
      minEligibleAudience,
      maxExposurePercent,
      treatmentPercent,
      strategy,
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
