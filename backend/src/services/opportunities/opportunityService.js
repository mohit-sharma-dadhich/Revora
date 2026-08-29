const { getRankedOpportunities, getRevenueOpportunity } = require('./revenueOpportunity');
const { generateRecommendationFromOpportunity } = require('../agent/revenueAgent');

async function listOpportunities({ auth, limit = 5 } = {}) {
  const opportunities = await getRankedOpportunities({ auth, limit });

  return {
    opportunities,
  };
}

async function getRecommendationForOpportunity(opportunity) {
  try {
    const recommendation = await generateRecommendationFromOpportunity(opportunity);

    return {
      recommendation,
      aiAvailable: true,
      aiError: null,
    };
  } catch (error) {
    return {
      recommendation: null,
      aiAvailable: false,
      aiError: error.message,
    };
  }
}

async function getOpportunityRecommendation(auth) {
  const opportunity = await getRevenueOpportunity({ auth });

  if (!opportunity) {
    return {
      opportunity: null,
      recommendation: null,
      aiAvailable: false,
      aiError: null,
    };
  }

  const result = await getRecommendationForOpportunity(opportunity);

  return {
    opportunity,
    recommendation: result.recommendation,
    aiAvailable: result.aiAvailable,
    aiError: result.aiError,
  };
}

module.exports = {
  getOpportunityRecommendation,
  listOpportunities,
  getRecommendationForOpportunity,
};
