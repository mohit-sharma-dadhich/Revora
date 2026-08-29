const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { ownershipFilter } = require('../../utils/ownership');

const MIN_BASE_CUSTOMERS = 20;

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

async function getProductAffinity({ minBaseCustomers = MIN_BASE_CUSTOMERS, auth } = {}) {
  if (!Number.isInteger(minBaseCustomers) || minBaseCustomers < 0) {
    throw new Error('minBaseCustomers must be a non-negative integer');
  }

  const productCustomers = await Order.aggregate([
    {
      $match: {
        ...ownershipFilter(auth),
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

  const productDocs = await Product.find({ ...ownershipFilter(auth) }, { _id: 1 }).lean();
  const productIds = productDocs.map((product) => String(product._id));

  const pairResults = [];

  for (const baseProductId of productIds) {
    const baseCustomers = customerSetsByProduct.get(baseProductId) || new Set();

    if (baseCustomers.size < minBaseCustomers) {
      continue;
    }

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

  return sortPairResults(pairResults);
}

module.exports = {
  getProductAffinity,
  MIN_BASE_CUSTOMERS,
};
