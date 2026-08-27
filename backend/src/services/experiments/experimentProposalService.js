const mongoose = require('mongoose');

const Experiment = require('../../models/Experiment');
const AuditLog = require('../../models/AuditLog');
const Customer = require('../../models/Customer');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { getRevenueOpportunity } = require('../opportunities/revenueOpportunity');

const DEFAULT_MIN_ELIGIBLE_AUDIENCE = 20;
const DEFAULT_MAX_EXPOSURE_PERCENT = 0.2;
const DEFAULT_TREATMENT_PERCENT = 0.5;
const DEFAULT_STRATEGY = 'CROSS_SELL';

function normalizeOptions(options = {}) {
  const minEligibleAudience = Number.isInteger(options.minEligibleAudience)
    ? options.minEligibleAudience
    : DEFAULT_MIN_ELIGIBLE_AUDIENCE;

  const maxExposurePercent = Number.isFinite(options.maxExposurePercent)
    ? options.maxExposurePercent
    : DEFAULT_MAX_EXPOSURE_PERCENT;

  const treatmentPercent = Number.isFinite(options.treatmentPercent)
    ? options.treatmentPercent
    : DEFAULT_TREATMENT_PERCENT;

  const strategy = options.strategy || DEFAULT_STRATEGY;

  return {
    minEligibleAudience,
    maxExposurePercent,
    treatmentPercent,
    strategy,
  };
}

async function logAudit({ actor, action, status, reason, metadata }) {
  await AuditLog.create({
    actor,
    action,
    status,
    reason: reason || null,
    metadata: metadata || {},
  });
}

async function findEligibleCustomersForProduct(baseProductId) {
  const eligibleRows = await Order.aggregate([
    {
      $match: {
        source: 'historical',
        status: 'completed',
        productIds: new mongoose.Types.ObjectId(baseProductId),
      },
    },
    {
      $group: {
        _id: '$customerId',
      },
    },
  ]);

  return eligibleRows
    .map((row) => row._id.toString())
    .sort((left, right) => left.localeCompare(right));
}

function buildGuardrailChecks({
  eligibleCustomerIds,
  minEligibleAudience,
  maxExposurePercent,
  treatmentPercent,
  strategy,
  baseProductId,
  relatedProductId,
  baseProductExists,
  relatedProductExists,
  activeExperimentExists,
}) {
  const checks = [];

  const minimumAudiencePassed = eligibleCustomerIds.length >= minEligibleAudience;
  checks.push({
    name: 'minimum_audience',
    passed: minimumAudiencePassed,
    reason: minimumAudiencePassed
      ? `Eligible customer count ${eligibleCustomerIds.length} meets minimum ${minEligibleAudience}.`
      : `Eligible customer count ${eligibleCustomerIds.length} is below minimum ${minEligibleAudience}.`,
  });

  const maxAudienceSize = Math.floor(eligibleCustomerIds.length * maxExposurePercent);
  const maxExposurePassed = maxAudienceSize >= 1;
  checks.push({
    name: 'maximum_exposure',
    passed: maxExposurePassed,
    reason: maxExposurePassed
      ? `Maximum experiment audience is ${maxAudienceSize} from ${eligibleCustomerIds.length} eligible customers at ${maxExposurePercent * 100}%.`
      : `Exposure percentage ${maxExposurePercent * 100}% yields no eligible customers for the experiment.`,
  });

  const strategyPassed = strategy === DEFAULT_STRATEGY;
  checks.push({
    name: 'strategy_validity',
    passed: strategyPassed,
    reason: strategyPassed
      ? `Strategy ${strategy} is supported.`
      : `Strategy ${strategy} is not supported for this MVP.`,
  });

  const productValidityPassed = Boolean(baseProductExists && relatedProductExists);
  checks.push({
    name: 'product_validity',
    passed: productValidityPassed,
    reason: productValidityPassed
      ? 'Base and target products exist.'
      : 'One or both products could not be found.',
  });

  const duplicateExperimentPassed = !activeExperimentExists;
  checks.push({
    name: 'duplicate_active_experiment',
    passed: duplicateExperimentPassed,
    reason: duplicateExperimentPassed
      ? 'No active duplicate experiment exists.'
      : 'An active experiment already exists for this opportunity.',
  });

  const selectedAudienceSize = Math.max(2, Math.min(maxAudienceSize, eligibleCustomerIds.length));
  const treatmentAudienceSize = Math.max(1, Math.round(selectedAudienceSize * treatmentPercent));
  const controlAudienceSize = selectedAudienceSize - treatmentAudienceSize;
  const treatmentSplitPassed = selectedAudienceSize >= 2 && controlAudienceSize >= 1 && treatmentAudienceSize >= 1;

  checks.push({
    name: 'treatment_percentage',
    passed: treatmentSplitPassed,
    reason: treatmentSplitPassed
      ? `Selected audience ${selectedAudienceSize} produces control=${controlAudienceSize} and treatment=${treatmentAudienceSize}.`
      : `Selected audience ${selectedAudienceSize} is too small to produce both control and treatment groups.`,
  });

  return checks;
}

function evaluateGuardrails({
  eligibleCustomerIds,
  minEligibleAudience,
  maxExposurePercent,
  treatmentPercent,
  strategy,
  baseProductId,
  relatedProductId,
  baseProductExists,
  relatedProductExists,
  activeExperimentExists,
}) {
  const checks = buildGuardrailChecks({
    eligibleCustomerIds,
    minEligibleAudience,
    maxExposurePercent,
    treatmentPercent,
    strategy,
    baseProductId,
    relatedProductId,
    baseProductExists,
    relatedProductExists,
    activeExperimentExists,
  });

  const passed = checks.every((check) => check.passed);

  return {
    passed,
    checks,
  };
}

function assignAudienceDeterministically(audienceCustomerIds, treatmentPercent) {
  const sortedAudience = [...audienceCustomerIds].sort((left, right) => left.localeCompare(right));

  if (sortedAudience.length < 2) {
    return {
      controlCustomerIds: sortedAudience,
      treatmentCustomerIds: [],
    };
  }

  const treatmentCount = Math.max(1, Math.round(sortedAudience.length * treatmentPercent));
  const controlCount = sortedAudience.length - treatmentCount;

  const treatmentCustomerIds = sortedAudience.slice(sortedAudience.length - treatmentCount);
  const controlCustomerIds = sortedAudience.slice(0, controlCount);

  return {
    controlCustomerIds,
    treatmentCustomerIds,
  };
}

async function getActiveExperimentForOpportunity(relatedProductId) {
  return Experiment.findOne({
    strategy: DEFAULT_STRATEGY,
    targetProductId: new mongoose.Types.ObjectId(relatedProductId),
    status: { $in: ['draft', 'pending', 'running'] },
  }).lean();
}

async function proposeExperiment({ opportunity, minEligibleAudience = DEFAULT_MIN_ELIGIBLE_AUDIENCE, maxExposurePercent = DEFAULT_MAX_EXPOSURE_PERCENT, treatmentPercent = DEFAULT_TREATMENT_PERCENT, strategy = DEFAULT_STRATEGY } = {}) {
  if (!opportunity || !opportunity.baseProductId || !opportunity.relatedProductId) {
    throw new Error('A valid opportunity is required to propose an experiment');
  }

  const baseProductExists = await Product.exists({ _id: opportunity.baseProductId });
  const relatedProductExists = await Product.exists({ _id: opportunity.relatedProductId });

  const eligibleCustomerIds = await findEligibleCustomersForProduct(opportunity.baseProductId);
  const activeExperimentExists = await getActiveExperimentForOpportunity(opportunity.relatedProductId);

  const guardrails = evaluateGuardrails({
    eligibleCustomerIds,
    minEligibleAudience,
    maxExposurePercent,
    treatmentPercent,
    strategy,
    baseProductId: opportunity.baseProductId,
    relatedProductId: opportunity.relatedProductId,
    baseProductExists: Boolean(baseProductExists),
    relatedProductExists: Boolean(relatedProductExists),
    activeExperimentExists: Boolean(activeExperimentExists),
  });

  if (!guardrails.passed) {
    await logAudit({
      actor: 'system',
      action: 'EXPERIMENT_BLOCKED',
      status: 'BLOCKED',
      reason: 'Guardrail checks failed before experiment creation.',
      metadata: {
        opportunity,
        guardrails,
      },
    });

    return {
      opportunity,
      proposal: null,
      guardrails,
      experiment: activeExperimentExists
        ? {
            id: activeExperimentExists._id.toString(),
            strategy: activeExperimentExists.strategy,
            targetProductId: activeExperimentExists.targetProductId.toString(),
            status: activeExperimentExists.status,
            decision: activeExperimentExists.decision,
          }
        : null,
    };
  }

  const maxAudienceSize = Math.floor(eligibleCustomerIds.length * maxExposurePercent);
  const finalAudienceSize = Math.max(2, Math.min(maxAudienceSize, eligibleCustomerIds.length));
  const selectedAudienceIds = eligibleCustomerIds.slice(0, finalAudienceSize);
  const assignedAudience = assignAudienceDeterministically(selectedAudienceIds, treatmentPercent);

  const proposal = {
    strategy,
    baseProductId: opportunity.baseProductId,
    targetProductId: opportunity.relatedProductId,
    eligibleCustomerCount: eligibleCustomerIds.length,
    proposedAudienceSize: selectedAudienceIds.length,
    maximumAudienceSize: maxAudienceSize,
    treatmentPercentage: treatmentPercent,
    controlCustomerIds: assignedAudience.controlCustomerIds,
    treatmentCustomerIds: assignedAudience.treatmentCustomerIds,
    status: 'pending',
    decision: 'PENDING',
  };

  const experiment = await Experiment.create({
    strategy,
    targetProductId: opportunity.relatedProductId,
    status: 'pending',
    controlCustomerIds: assignedAudience.controlCustomerIds.map((id) => new mongoose.Types.ObjectId(id)),
    treatmentCustomerIds: assignedAudience.treatmentCustomerIds.map((id) => new mongoose.Types.ObjectId(id)),
    decision: 'PENDING',
    results: {
      baseProductId: opportunity.baseProductId,
      relatedProductId: opportunity.relatedProductId,
      eligibleCustomerCount: eligibleCustomerIds.length,
      proposedAudienceSize: selectedAudienceIds.length,
      maximumAudienceSize: maxAudienceSize,
      treatmentPercentage: treatmentPercent,
      guardrails,
      createdFromOpportunity: true,
    },
  });

  await logAudit({
    actor: 'system',
    action: 'EXPERIMENT_CREATED',
    status: 'SUCCESS',
    reason: 'Experiment proposal passed guardrails and was created.',
    metadata: {
      experimentId: experiment._id.toString(),
      strategy,
      targetProductId: opportunity.relatedProductId,
      opportunity,
    },
  });

  return {
    opportunity,
    proposal,
    guardrails,
    experiment: {
      id: experiment._id.toString(),
      strategy: experiment.strategy,
      targetProductId: experiment.targetProductId.toString(),
      status: experiment.status,
      decision: experiment.decision,
    },
  };
}

async function createProposalFromBestOpportunity({
  minEligibleAudience = DEFAULT_MIN_ELIGIBLE_AUDIENCE,
  maxExposurePercent = DEFAULT_MAX_EXPOSURE_PERCENT,
  treatmentPercent = DEFAULT_TREATMENT_PERCENT,
  strategy = DEFAULT_STRATEGY,
} = {}) {
  const opportunity = await getRevenueOpportunity();

  if (!opportunity) {
    return {
      opportunity: null,
      proposal: null,
      guardrails: {
        passed: false,
        checks: [{
          name: 'opportunity_available',
          passed: false,
          reason: 'No valid opportunity is available for experiment proposal.',
        }],
      },
      experiment: null,
    };
  }

  return proposeExperiment({
    opportunity,
    minEligibleAudience,
    maxExposurePercent,
    treatmentPercent,
    strategy,
  });
}

module.exports = {
  DEFAULT_MIN_ELIGIBLE_AUDIENCE,
  DEFAULT_MAX_EXPOSURE_PERCENT,
  DEFAULT_STRATEGY,
  DEFAULT_TREATMENT_PERCENT,
  assignAudienceDeterministically,
  createProposalFromBestOpportunity,
  evaluateGuardrails,
  findEligibleCustomersForProduct,
  getActiveExperimentForOpportunity,
  logAudit,
  proposeExperiment,
};
