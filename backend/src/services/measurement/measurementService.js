const Experiment = require('../../models/Experiment');
const Order = require('../../models/Order');

const VALID_GROUPS = new Set(['control', 'treatment']);
const VALID_MEASUREMENT_STATUSES = new Set(['running', 'completed']);

function roundValue(value) {
  return Number(Number(value).toFixed(4));
}

async function getGroupMetrics({ experimentId, group, customerIds = [] }) {
  if (!experimentId) {
    throw new Error('Experiment identifier is required.');
  }

  if (!VALID_GROUPS.has(group)) {
    throw new Error('Group must be control or treatment.');
  }

  const audienceSize = Array.isArray(customerIds) ? customerIds.length : 0;
  const orders = await Order.find({
    experimentId,
    experimentGroup: group,
    source: 'experiment',
  }).lean();

  const paidOrders = orders.filter((order) => order.status === 'paid');
  const convertedCustomerIds = new Set(
    paidOrders
      .map((order) => (order.customerId ? order.customerId.toString() : null))
      .filter(Boolean)
  );
  const convertedCustomerCount = convertedCustomerIds.size;
  const totalRevenue = paidOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

  return {
    audienceSize,
    convertedCustomerCount,
    conversionRate: audienceSize === 0 ? 0 : roundValue(convertedCustomerCount / audienceSize),
    totalRevenue,
    averageOrderValue: convertedCustomerCount === 0 ? 0 : roundValue(totalRevenue / convertedCustomerCount),
  };
}

function calculateIncrementalRevenue({ controlMetrics, treatmentMetrics }) {
  const controlRevenuePerCustomer = controlMetrics && controlMetrics.audienceSize > 0
    ? roundValue(controlMetrics.totalRevenue / controlMetrics.audienceSize)
    : 0;

  const treatmentRevenuePerCustomer = treatmentMetrics && treatmentMetrics.audienceSize > 0
    ? roundValue(treatmentMetrics.totalRevenue / treatmentMetrics.audienceSize)
    : 0;

  const incrementalRevenuePerEligibleCustomer = roundValue(
    treatmentRevenuePerCustomer - controlRevenuePerCustomer
  );

  const revenueUpliftPercent = controlRevenuePerCustomer === 0
    ? null
    : roundValue(((treatmentRevenuePerCustomer - controlRevenuePerCustomer) / controlRevenuePerCustomer) * 100);

  return {
    revenuePerCustomerControl: controlRevenuePerCustomer,
    revenuePerCustomerTreatment: treatmentRevenuePerCustomer,
    incrementalRevenuePerEligibleCustomer,
    revenueUpliftPercent,
  };
}

async function measureExperiment(experimentId) {
  if (!experimentId) {
    throw new Error('Experiment identifier is required.');
  }

  const experiment = await Experiment.findById(experimentId).lean();

  if (!experiment) {
    throw new Error('Experiment not found.');
  }

  if (!VALID_MEASUREMENT_STATUSES.has(experiment.status)) {
    throw new Error('Experiment must be running or completed before measurement.');
  }

  const controlCustomerIds = Array.isArray(experiment.controlCustomerIds)
    ? experiment.controlCustomerIds.map((customerId) => customerId.toString())
    : [];

  const treatmentCustomerIds = Array.isArray(experiment.treatmentCustomerIds)
    ? experiment.treatmentCustomerIds.map((customerId) => customerId.toString())
    : [];

  const controlMetrics = await getGroupMetrics({
    experimentId,
    group: 'control',
    customerIds: controlCustomerIds,
  });

  const treatmentMetrics = await getGroupMetrics({
    experimentId,
    group: 'treatment',
    customerIds: treatmentCustomerIds,
  });

  return {
    control: controlMetrics,
    treatment: treatmentMetrics,
    incremental: calculateIncrementalRevenue({
      controlMetrics,
      treatmentMetrics,
    }),
  };
}

module.exports = {
  VALID_GROUPS,
  VALID_MEASUREMENT_STATUSES,
  calculateIncrementalRevenue,
  getGroupMetrics,
  measureExperiment,
};
