const Order = require('../../models/Order');
const { ownershipFilter } = require('../../utils/ownership');

async function listPaymentAudits({ auth, limit = 50, skip = 0 } = {}) {
  const maxLimit = 200;
  const clampedLimit = Math.min(Math.max(1, Number.isInteger(limit) ? limit : 50), maxLimit);
  const clampedSkip = Math.max(0, Number.isInteger(skip) ? skip : 0);

  const filter = { ...ownershipFilter(auth), source: 'experiment' };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(clampedSkip)
      .limit(clampedLimit)
      .select('razorpayOrderId razorpayPaymentId status amount experimentId experimentGroup customerId auditSteps createdAt')
      .lean(),
    Order.countDocuments(filter),
  ]);

  return {
    payments: orders.map((order) => ({
      id: order._id.toString(),
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      status: order.status,
      amount: order.amount,
      experimentId: order.experimentId ? order.experimentId.toString() : null,
      experimentGroup: order.experimentGroup || null,
      customerId: order.customerId ? order.customerId.toString() : null,
      createdAt: order.createdAt.toISOString(),
      steps: (order.auditSteps || []).map((step) => ({
        stepType: step.stepType,
        status: step.status,
        reason: step.reason,
        metadata: step.metadata || {},
        timestamp: step.timestamp.toISOString(),
      })),
    })),
    total,
    limit: clampedLimit,
    skip: clampedSkip,
  };
}

module.exports = { listPaymentAudits };
