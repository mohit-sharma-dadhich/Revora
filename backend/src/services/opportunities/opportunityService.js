const { getRevenueOpportunity } = require('./revenueOpportunity');
const { generateRecommendationFromOpportunity } = require('../agent/revenueAgent');

async function getOpportunityRecommendation() {
  const opportunity = await getRevenueOpportunity();

  if (!opportunity) {
    return {
      opportunity: null,
      recommendation: null,
    };
  }

  try {
    const recommendation = await generateRecommendationFromOpportunity(opportunity);

    return {
      opportunity,
      recommendation,
      aiAvailable: true,
    };
  } catch (error) {
    return {
      opportunity,
      recommendation: null,
      aiAvailable: false,
      aiError: error.message,
    };
  }
}

module.exports = {
  getOpportunityRecommendation,
};
