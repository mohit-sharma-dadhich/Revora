const {
  getOpportunityRecommendation,
  listOpportunities,
  getRecommendationForOpportunity,
} = require('../services/opportunities/opportunityService');

async function getOpportunity(req, res) {
  try {
    const dataSource = req.query.dataSource || 'auto';
    const result = await getOpportunityRecommendation(req.auth, dataSource);

    return res.status(200).json({
      success: true,
      data: {
        opportunity: result.opportunity,
        recommendation: result.recommendation,
        aiAvailable: result.aiAvailable ?? false,
        aiError: result.aiError || null,
        usedPrivateDataOnly: result.usedPrivateDataOnly ?? false,
        diagnostic: result.diagnostic || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

async function listOpportunitiesHandler(req, res) {
  try {
    const rawLimit = Number.parseInt(req.query.limit ?? '5', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 10) : 5;
    const dataSource = req.query.dataSource || 'auto';
    const result = await listOpportunities({ auth: req.auth, limit, dataSource });

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

async function getRecommendation(req, res) {
  try {
    const opportunity = req.body && typeof req.body === 'object' ? (req.body.opportunity ?? req.body) : null;

    if (!opportunity || typeof opportunity !== 'object' || Array.isArray(opportunity)) {
      return res.status(400).json({
        success: false,
        error: 'A valid opportunity object with baseProductId and relatedProductId is required',
      });
    }

    if (!opportunity.baseProductId || !opportunity.relatedProductId) {
      return res.status(400).json({
        success: false,
        error: 'A valid opportunity object with baseProductId and relatedProductId is required',
      });
    }

    const result = await getRecommendationForOpportunity(opportunity);

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
  getOpportunity,
  listOpportunitiesHandler,
  getRecommendation,
};
