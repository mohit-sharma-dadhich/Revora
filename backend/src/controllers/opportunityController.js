const { getOpportunityRecommendation } = require('../services/opportunities/opportunityService');

async function getOpportunity(req, res) {
  try {
    const result = await getOpportunityRecommendation();

    return res.status(200).json({
      success: true,
      data: {
        opportunity: result.opportunity,
        recommendation: result.recommendation,
        aiAvailable: result.aiAvailable ?? false,
        aiError: result.aiError || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  getOpportunity,
};
