const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { ownershipFilter, ownershipFields } = require('../../utils/ownership');

const MIN_BASE_CUSTOMERS = 20;
const DEFAULT_MIN_AFFINITY = 0.65;

function sortPairResults(results) {
  return results.sort((left, right) => {
    if (right.affinity !== left.affinity) {
      return right.affinity - left.affinity;
    }

    if (left.baseProductId !== right.baseProductId) {
      return left.baseProductId.localeCompare(right.baseProductId);
    }

    return left.relatedProductId.localeCompare(right.relatedProductId);
  });
}

async function getProductAffinity({ minBaseCustomers = MIN_BASE_CUSTOMERS, minAffinity = DEFAULT_MIN_AFFINITY, auth } = {}) {
  if (!Number.isInteger(minBaseCustomers) || minBaseCustomers < 0) {
    throw new Error('minBaseCustomers must be a non-negative integer');
  }

  if (!Number.isFinite(minAffinity) || minAffinity < 0 || minAffinity > 1) {
    throw new Error('minAffinity must be a number between 0 and 1');
  }

  const strictScope = ownershipFields(auth);
  const hasPrivateData = Object.keys(strictScope).length > 0
    && await Order.exists({ ...strictScope, source: 'historical' });
  const discoveryScope = hasPrivateData ? strictScope : ownershipFilter(auth);

  const productCustomers = await Order.aggregate([
    {
      $match: {
        ...discoveryScope,
        source: 'historical',
        status: 'completed',
      },
    },
    {
      $unwind: '$productIds',
    },
    {
      $group: {
        _id: '$productIds',
        customerIds: { $addToSet: '$customerId' },
      },
    },
  ]);

  const customerSetsByProduct = new Map();
  for (const row of productCustomers) {
    const productId = String(row._id);
    customerSetsByProduct.set(productId, new Set(row.customerIds.map((customerId) => String(customerId))));
  }

  const productDocs = await Product.find({ ...discoveryScope }, { _id: 1 }).lean();
  const productIds = productDocs.map((product) => String(product._id));

  const pairResults = [];
  let eligibleBaseProductCount = 0;

  for (const baseProductId of productIds) {
    const baseCustomers = customerSetsByProduct.get(baseProductId) || new Set();

    if (baseCustomers.size < minBaseCustomers) {
      continue;
    }

    eligibleBaseProductCount += 1;

    for (const relatedProductId of productIds) {
      if (baseProductId === relatedProductId) {
        continue;
      }

      const relatedCustomers = customerSetsByProduct.get(relatedProductId) || new Set();
      const coPurchaseCustomerCount = [...baseCustomers].filter((customerId) => relatedCustomers.has(customerId)).length;
      const affinity = baseCustomers.size === 0 ? 0 : coPurchaseCustomerCount / baseCustomers.size;

      pairResults.push({
        baseProductId,
        relatedProductId,
        baseCustomerCount: baseCustomers.size,
        coPurchaseCustomerCount,
        affinity: Number(affinity.toFixed(10)),
      });
    }
  }

  const sortedPairResults = sortPairResults(pairResults);
  const bestUnqualifiedPair = sortedPairResults.find((pair) => pair.affinity < minAffinity) || null;

  return {
    pairResults: sortedPairResults,
    usedPrivateDataOnly: hasPrivateData,
    productCount: productIds.length,
    eligibleBaseProductCount,
    audienceBlocked: productIds.length > 0 && eligibleBaseProductCount === 0,
    bestUnqualifiedAffinity: bestUnqualifiedPair ? bestUnqualifiedPair.affinity : null,
    bestUnqualifiedBaseCustomers: bestUnqualifiedPair ? bestUnqualifiedPair.baseCustomerCount : null,
  };
}

module.exports = {
  getProductAffinity,
  MIN_BASE_CUSTOMERS,
};
