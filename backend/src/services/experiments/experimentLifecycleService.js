const Experiment = require('../../models/Experiment');
const Order = require('../../models/Order');
const AuditLog = require('../../models/AuditLog');
const { measureExperiment } = require('../measurement/measurementService');
const { decideOutcome } = require('./decisionService');
const { ownershipFilter } = require('../../utils/ownership');

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
    ...(auth ? { ...ownershipFilter(auth), expiresAt: auth.mode === 'test' ? auth.expiresAt : null } : {}),
  });
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

  if (experiment.status === 'running') {
    const message = 'Experiment is already running.';

    await logLifecycleEvent({
      action: 'EXPERIMENT_START_REJECTED',
      status: 'BLOCKED',
      reason: message,
      experimentId: experiment._id.toString(),
      metadata: {
        previousStatus: currentStatus,
        attemptedTransition: 'running',
      },
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

async function completeExperiment(experimentId, auth) {
  if (!experimentId) {
    throw new Error('Experiment identifier is required.');
  }

  const experiment = await Experiment.findOne({ _id: experimentId, ...ownershipFilter(auth) });

  if (!experiment) {
    throw new Error('Experiment not found.');
  }

  if (experiment.status === 'completed') {
    throw new Error('Experiment is already completed.');
  }

  if (experiment.status !== 'running') {
    const message = `Invalid experiment state transition from ${experiment.status} to completed.`;

    await logLifecycleEvent({
      action: 'EXPERIMENT_COMPLETION_REJECTED',
      status: 'BLOCKED',
      reason: message,
      experimentId: experiment._id.toString(),
      metadata: {
        previousStatus: experiment.status,
        attemptedTransition: 'completed',
      },
    });

    throw new Error(message);
  }

  const [controlPayment, treatmentPayment] = await Promise.all([
    Order.exists({
      experimentId: experiment._id,
      ...ownershipFilter(auth),
      experimentGroup: 'control',
      source: 'experiment',
      status: 'paid',
    }),
    Order.exists({
      experimentId: experiment._id,
      ...ownershipFilter(auth),
      experimentGroup: 'treatment',
      source: 'experiment',
      status: 'paid',
    }),
  ]);

  if (!controlPayment || !treatmentPayment) {
    throw new Error('At least one paid payment is required for both control and treatment groups before completion.');
  }

  experiment.status = 'completed';
  experiment.endAt = experiment.endAt || new Date();

  await experiment.save();

  await logLifecycleEvent({
    action: 'EXPERIMENT_COMPLETED',
    status: 'SUCCESS',
    reason: 'Experiment transitioned to completed.',
    experimentId: experiment._id.toString(),
    metadata: {
      strategy: experiment.strategy,
      targetProductId: experiment.targetProductId.toString(),
      finalStatus: experiment.status,
    },
    auth,
  });

  return normalizeExperiment(experiment.toObject());
}

async function completeExperimentWithMeasurement(experimentId, options = {}, auth) {
  if (!experimentId) {
    throw new Error('Experiment identifier is required.');
  }

  const completedExperiment = await completeExperiment(experimentId, auth);
  const measurement = await measureExperiment(experimentId);
  const outcome = decideOutcome({
    ...measurement,
    ...options,
  });

  const experiment = await Experiment.findOne({ _id: experimentId, ...ownershipFilter(auth) });

  if (!experiment) {
    throw new Error('Experiment not found.');
  }

  experiment.results = {
    ...(experiment.results || {}),
    measurement,
    decisionChecks: outcome.checks,
  };
  experiment.decision = outcome.decision;

  await experiment.save();

  await logLifecycleEvent({
    action: 'EXPERIMENT_DECISION_RECORDED',
    status: 'SUCCESS',
    reason: 'Experiment measurement and decision recorded.',
    experimentId: experiment._id.toString(),
    metadata: {
      decision: outcome.decision,
      incrementalRevenue: measurement.incremental.incrementalRevenuePerEligibleCustomer,
    },
  });

  return normalizeExperiment(experiment.toObject());
}

module.exports = {
  PRE_RUNNING_STATUSES,
  completeExperiment,
  completeExperimentWithMeasurement,
  getExperimentById,
  logLifecycleEvent,
  normalizeExperiment,
  startExperiment,
};
