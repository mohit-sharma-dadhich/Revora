const Experiment = require('../../models/Experiment');
const Order = require('../../models/Order');
const AuditLog = require('../../models/AuditLog');
const { measureExperiment } = require('../measurement/measurementService');
const { decideOutcome } = require('./decisionService');
const {
  findEligibleCustomersForProduct,
  selectAudienceDeterministically,
  assignAudienceDeterministically,
} = require('./experimentProposalService');
const { ownershipFields, ownershipFilter } = require('../../utils/ownership');

const PRE_RUNNING_STATUSES = new Set(['draft', 'pending']);

function normalizeExperiment(experiment) {
  if (!experiment) {
    return null;
  }

  return {
    id: experiment._id.toString(),
    strategy: experiment.strategy,
    targetProductId: experiment.targetProductId ? experiment.targetProductId.toString() : null,
    status: experiment.status,
    controlCustomerIds: (experiment.controlCustomerIds || []).map((id) => id.toString()),
    treatmentCustomerIds: (experiment.treatmentCustomerIds || []).map((id) => id.toString()),
    startAt: experiment.startAt ? experiment.startAt.toISOString() : null,
    endAt: experiment.endAt ? experiment.endAt.toISOString() : null,
    results: experiment.results || {},
    decision: experiment.decision,
    createdAt: experiment.createdAt ? experiment.createdAt.toISOString() : null,
    updatedAt: experiment.updatedAt ? experiment.updatedAt.toISOString() : null,
  };
}

async function logLifecycleEvent({ action, status = 'SUCCESS', reason, experimentId, metadata = {}, auth }) {
  await AuditLog.create({
    actor: 'system',
    action,
    status,
    reason: reason || null,
    metadata: {
      experimentId,
      ...metadata,
    },
    ...(auth ? { ...ownershipFields(auth), expiresAt: auth.mode === 'test' ? auth.expiresAt : null } : {}),
  });
}

async function countNewCompletedOrdersByGroup(experiment, since) {
  const [newControlCount, newTreatmentCount] = await Promise.all([
    Order.countDocuments({
      experimentId: experiment._id,
      experimentGroup: 'control',
      source: 'experiment',
      status: 'paid',
      customerId: { $in: experiment.controlCustomerIds },
      createdAt: { $gt: since },
    }),
    Order.countDocuments({
      experimentId: experiment._id,
      experimentGroup: 'treatment',
      source: 'experiment',
      status: 'paid',
      customerId: { $in: experiment.treatmentCustomerIds },
      createdAt: { $gt: since },
    }),
  ]);
  return { newControlCount, newTreatmentCount };
}

async function getExperimentById(experimentId, auth) {
  if (!experimentId) {
    throw new Error('Experiment identifier is required.');
  }

  const experiment = await Experiment.findOne({ _id: experimentId, ...ownershipFilter(auth) }).lean();

  if (!experiment) {
    throw new Error('Experiment not found.');
  }

  return normalizeExperiment(experiment);
}

async function startExperiment(experimentId, auth) {
  if (!experimentId) {
    throw new Error('Experiment identifier is required.');
  }

  const experiment = await Experiment.findOne({ _id: experimentId, ...ownershipFilter(auth) });

  if (!experiment) {
    throw new Error('Experiment not found.');
  }

  if (!experiment.targetProductId) {
    throw new Error('Experiment target product is missing.');
  }

  if (!experiment.controlCustomerIds || experiment.controlCustomerIds.length === 0) {
    throw new Error('Experiment control group is empty.');
  }

  if (!experiment.treatmentCustomerIds || experiment.treatmentCustomerIds.length === 0) {
    throw new Error('Experiment treatment group is empty.');
  }

  const currentStatus = experiment.status;

  if (!PRE_RUNNING_STATUSES.has(currentStatus)) {
    const message = `Invalid experiment state transition from ${currentStatus} to running.`;

    await logLifecycleEvent({
      action: 'EXPERIMENT_START_REJECTED',
      status: 'BLOCKED',
      reason: message,
      experimentId: experiment._id.toString(),
      metadata: {
        previousStatus: currentStatus,
        attemptedTransition: 'running',
      },
      auth,
    });

    throw new Error(message);
  }

  experiment.status = 'running';
  experiment.startAt = experiment.startAt || new Date();
  experiment.endAt = null;

  await experiment.save();

  await logLifecycleEvent({
    action: 'EXPERIMENT_STARTED',
    status: 'SUCCESS',
    reason: 'Experiment transitioned to running.',
    experimentId: experiment._id.toString(),
    metadata: {
      strategy: experiment.strategy,
      targetProductId: experiment.targetProductId.toString(),
      controlCount: experiment.controlCustomerIds.length,
      treatmentCount: experiment.treatmentCustomerIds.length,
      newStatus: experiment.status,
    },
    auth,
  });

  return normalizeExperiment(experiment.toObject());
}

async function analyzeExperiment(experimentId, auth, { bypassRateLimit = false } = {}) {
  const experiment = await Experiment.findOne({ _id: experimentId, ...ownershipFilter(auth) });

  if (!experiment) {
    throw new Error('Experiment not found.');
  }

  if (experiment.status !== 'running') {
    throw new Error(`Cannot analyze an experiment with status ${experiment.status}.`);
  }

  if (!bypassRateLimit) {
    const cutoff = experiment.lastAnalyzedAt || experiment.startAt;
    const { newControlCount, newTreatmentCount } = await countNewCompletedOrdersByGroup(experiment, cutoff);

    if (newControlCount < 1 && newTreatmentCount < 1) {
      throw new Error(`Need at least 1 new paid experiment order in control or treatment since the last analysis (control: ${newControlCount} new, treatment: ${newTreatmentCount} new).`);
    }
  }

  const measurement = await measureExperiment(experimentId);
  const outcome = decideOutcome(measurement);

  experiment.results = {
    ...(experiment.results || {}),
    measurement,
    decisionChecks: outcome.checks,
  };
  experiment.decision = outcome.decision;

  if (!bypassRateLimit) {
    experiment.lastAnalyzedAt = new Date();
  }

  await experiment.save();

  await logLifecycleEvent({
    action: bypassRateLimit ? 'EXPERIMENT_ANALYZED_ON_END' : 'EXPERIMENT_ANALYZED',
    status: 'SUCCESS',
    reason: bypassRateLimit ? 'Experiment analyzed during completion.' : 'Experiment analyzed with new completed order evidence.',
    experimentId: experiment._id.toString(),
    metadata: {
      decision: outcome.decision,
      incrementalRevenue: measurement.incremental.incrementalRevenuePerEligibleCustomer,
    },
    auth,
  });

  return {
    experiment: normalizeExperiment(experiment.toObject()),
    measurement,
    decision: outcome.decision,
  };
}

async function scaleExperiment(experimentId, options = {}, auth) {
  const experiment = await Experiment.findOne({ _id: experimentId, ...ownershipFilter(auth) });

  if (!experiment) {
    throw new Error('Experiment not found.');
  }

  if (experiment.status !== 'running') {
    throw new Error(`Cannot scale an experiment with status ${experiment.status}.`);
  }

  if (experiment.decision !== 'SCALE') {
    throw new Error('Can only scale an experiment with a SCALE decision.');
  }

  const assignmentSeed = experiment.results && experiment.results.assignmentSeed;
  if (assignmentSeed === undefined || assignmentSeed === null) {
    throw new Error('Experiment has no assignment seed.');
  }

  const eligibleCustomerIds = await findEligibleCustomersForProduct(experiment.baseProductId, auth);
  const alreadyAssigned = new Set([
    ...(experiment.controlCustomerIds || []),
    ...(experiment.treatmentCustomerIds || []),
  ].map((customerId) => customerId.toString()));
  const remainingEligible = eligibleCustomerIds.filter((customerId) => !alreadyAssigned.has(customerId.toString()));
  const additionalAudienceSize = Number.isInteger(options.additionalAudienceSize)
    ? options.additionalAudienceSize
    : experiment.results.proposedAudienceSize;
  if (remainingEligible.length === 0) {
    throw new Error('No eligible customers remain for scaling.');
  }

  const maxAudienceSize = Math.floor(eligibleCustomerIds.length * (experiment.results.maxExposurePercent ?? 0.2));

  if (alreadyAssigned.size + additionalAudienceSize > maxAudienceSize) {
    throw new Error('Scaling would exceed the maximum exposure cap.');
  }

  const newCustomerIds = selectAudienceDeterministically(
    remainingEligible,
    Math.min(additionalAudienceSize, remainingEligible.length),
    assignmentSeed,
  );
  const assignedAudience = assignAudienceDeterministically(
    newCustomerIds,
    experiment.results.treatmentPercentage || 0.5,
    assignmentSeed,
  );
  const addedControl = assignedAudience.controlCustomerIds;
  const addedTreatment = assignedAudience.treatmentCustomerIds;
  const audienceSizeAfter = alreadyAssigned.size + newCustomerIds.length;

  experiment.controlCustomerIds.push(...addedControl);
  experiment.treatmentCustomerIds.push(...addedTreatment);
  experiment.lastScaledAt = new Date();
  experiment.scaleEvents.push({
    scaledAt: experiment.lastScaledAt,
    addedControlCount: addedControl.length,
    addedTreatmentCount: addedTreatment.length,
    assignmentSeed,
    audienceSizeAfter,
  });

  await experiment.save();

  await logLifecycleEvent({
    action: 'EXPERIMENT_SCALED',
    status: 'SUCCESS',
    reason: 'Experiment audience expanded after a SCALE decision.',
    experimentId: experiment._id.toString(),
    metadata: {
      addedControlCount: addedControl.length,
      addedTreatmentCount: addedTreatment.length,
      assignmentSeed,
      audienceSizeAfter,
    },
    auth,
  });

  return normalizeExperiment(experiment.toObject());
}

async function endExperiment(experimentId, auth) {
  let experiment = await Experiment.findOne({ _id: experimentId, ...ownershipFilter(auth) });

  if (!experiment) {
    throw new Error('Experiment not found.');
  }

  if (experiment.status !== 'running') {
    throw new Error(`Cannot end an experiment with status ${experiment.status}.`);
  }

  try {
    await analyzeExperiment(experimentId, auth, { bypassRateLimit: true });
  } catch (error) {
    await logLifecycleEvent({
      action: 'EXPERIMENT_END_STALE_DECISION',
      status: 'FAILED',
      reason: error.message,
      experimentId,
      auth,
    });
  }

  experiment = await Experiment.findOne({ _id: experimentId, ...ownershipFilter(auth) });

  if (!experiment) {
    throw new Error('Experiment not found.');
  }

  experiment.status = 'completed';
  experiment.endAt = new Date();
  await experiment.save();

  await logLifecycleEvent({
    action: 'EXPERIMENT_ENDED',
    status: 'SUCCESS',
    reason: 'Experiment ended.',
    experimentId: experiment._id.toString(),
    auth,
  });

  return normalizeExperiment(experiment.toObject());
}

module.exports = {
  PRE_RUNNING_STATUSES,
  analyzeExperiment,
  scaleExperiment,
  endExperiment,
  getExperimentById,
  logLifecycleEvent,
  normalizeExperiment,
  startExperiment,
};
