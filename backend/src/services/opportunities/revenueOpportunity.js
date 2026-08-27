const { getProductAffinity, MIN_BASE_CUSTOMERS } = require('../analytics/productAffinity');
const Product = require('../../models/Product');

const DEFAULT_MIN_AFFINITY = 0.65;

/**
 * The opportunity score intentionally combines two measurable signals from the
 * existing analytics layer:
 *   1. affinity: how often customers who bought the base product also bought the
 *      related product
 *   2. baseCustomerCount: how large the eligible audience is for the cross-sell
 *
 * This keeps the score deterministic and auditable. It does not use revenue data
 * because we are not allowed to invent or estimate monetary value from the current
 * seed without a reliable revenue model. The score is used only to rank valid
 * opportunities after the affinity threshold has already filtered weak pairs.
 *
 * We do not ask an LLM to calculate this because the correct answer is already
 * present in historical order data; the model would introduce hallucinated numbers
 * and non-reproducible rankings. Deterministic code should do this work.
 */
function calculateOpportunityScore({ affinity, baseCustomerCount }) {
  if (!Number.isFinite(affinity) || affinity < 0) {
    throw new Error('affinity must be a finite non-negative number');
  }

  if (!Number.isInteger(baseCustomerCount) || baseCustomerCount < 0) {
    throw new Error('baseCustomerCount must be a non-negative integer');
  }

  return Number((affinity * Math.sqrt(baseCustomerCount)).toFixed(10));
}

async function getRevenueOpportunity({
  minAffinity = DEFAULT_MIN_AFFINITY,
  minBaseCustomers = MIN_BASE_CUSTOMERS,
} = {}) {
  if (!Number.isFinite(minAffinity) || minAffinity < 0 || minAffinity > 1) {
    throw new Error('minAffinity must be a number between 0 and 1');
  }

  if (!Number.isInteger(minBaseCustomers) || minBaseCustomers < 0) {
    throw new Error('minBaseCustomers must be a non-negative integer');
  }

  const affinityResults = await getProductAffinity({ minBaseCustomers });

  const validOpportunities = affinityResults
    .filter((row) => row.affinity >= minAffinity)
    .map((row) => ({
      baseProductId: row.baseProductId,
      relatedProductId: row.relatedProductId,
      baseCustomerCount: row.baseCustomerCount,
      coPurchaseCustomerCount: row.coPurchaseCustomerCount,
      affinity: row.affinity,
      estimatedEligibleCustomers: row.baseCustomerCount,
      opportunityScore: calculateOpportunityScore({
        affinity: row.affinity,
        baseCustomerCount: row.baseCustomerCount,
      }),
    }));

  if (validOpportunities.length === 0) {
    return null;
  }

  validOpportunities.sort((left, right) => {
    if (right.opportunityScore !== left.opportunityScore) {
      return right.opportunityScore - left.opportunityScore;
    }

    if (right.affinity !== left.affinity) {
      return right.affinity - left.affinity;
    }

    if (left.baseProductId !== right.baseProductId) {
      return left.baseProductId.localeCompare(right.baseProductId);
    }

    return left.relatedProductId.localeCompare(right.relatedProductId);
  });

  const opportunity = validOpportunities[0];
  const products = await Product.find({
    _id: { $in: [opportunity.baseProductId, opportunity.relatedProductId] },
  }, { name: 1 }).lean();
  const productNames = new Map(products.map((product) => [product._id.toString(), product.name]));

  return {
    ...opportunity,
    baseProductName: productNames.get(opportunity.baseProductId) || null,
    relatedProductName: productNames.get(opportunity.relatedProductId) || null,
  };
}

module.exports = {
  DEFAULT_MIN_AFFINITY,
  calculateOpportunityScore,
  getRevenueOpportunity,
};
