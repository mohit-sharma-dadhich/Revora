const crypto = require('crypto');
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
const DEFAULT_ASSIGNMENT_SEED = 42;
const ASSIGNMENT_METHOD = 'seeded_fisher_yates';

function createSeededRandom(seed) {
  let state = Number(seed) >>> 0;

  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

async function generateUniqueAssignmentSeed() {
  let assignmentSeed;

  do {
    assignmentSeed = crypto.randomBytes(4).readUInt32BE(0);
  } while (await Experiment.exists({ 'results.assignmentSeed': assignmentSeed }));

  return assignmentSeed;
}

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

function ownershipFilter(auth) {
  if (!auth) return {};
  return auth.mode === 'test' ? { sessionId: auth.sessionId } : { ownerId: auth.user.id };
}

async function logAudit({ actor, action, status, reason, metadata, auth }) {
  await AuditLog.create({
    actor,
    action,
    status,
    reason: reason || null,
    metadata: metadata || {},
    ...(auth ? { ...ownershipFilter(auth), expiresAt: auth.mode === 'test' ? auth.expiresAt : null } : {}),
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

function shuffleAudienceDeterministically(audienceCustomerIds, seed = DEFAULT_ASSIGNMENT_SEED) {
  const shuffledAudience = [...audienceCustomerIds];
  const random = createSeededRandom(seed);

  for (let index = shuffledAudience.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffledAudience[index], shuffledAudience[swapIndex]] = [shuffledAudience[swapIndex], shuffledAudience[index]];
  }

  return shuffledAudience;
}

function selectAudienceDeterministically(eligibleCustomerIds, finalAudienceSize, seed = DEFAULT_ASSIGNMENT_SEED) {
  return shuffleAudienceDeterministically(eligibleCustomerIds, seed).slice(0, finalAudienceSize);
}

function assignAudienceDeterministically(audienceCustomerIds, treatmentPercent, seed = DEFAULT_ASSIGNMENT_SEED) {
  const shuffledAudience = shuffleAudienceDeterministically(audienceCustomerIds, seed);

  if (shuffledAudience.length < 2) {
    return {
      controlCustomerIds: shuffledAudience,
      treatmentCustomerIds: [],
    };
  }

  const treatmentCount = Math.max(1, Math.round(shuffledAudience.length * treatmentPercent));
  const controlCount = shuffledAudience.length - treatmentCount;

  const controlCustomerIds = shuffledAudience.slice(0, controlCount);
  const treatmentCustomerIds = shuffledAudience.slice(controlCount);

  return {
    controlCustomerIds,
    treatmentCustomerIds,
  };
}

async function getActiveExperimentForOpportunity(baseProductId, relatedProductId, strategy = DEFAULT_STRATEGY, auth) {
  return Experiment.findOne({
    ...ownershipFilter(auth),
    strategy,
    $or: [
      { baseProductId: new mongoose.Types.ObjectId(baseProductId) },
      { 'results.baseProductId': new mongoose.Types.ObjectId(baseProductId) },
    ],
    targetProductId: new mongoose.Types.ObjectId(relatedProductId),
    status: { $in: ['draft', 'pending', 'running'] },
  }).lean();
}

async function proposeExperiment({ opportunity, minEligibleAudience = DEFAULT_MIN_ELIGIBLE_AUDIENCE, maxExposurePercent = DEFAULT_MAX_EXPOSURE_PERCENT, treatmentPercent = DEFAULT_TREATMENT_PERCENT, strategy = DEFAULT_STRATEGY, auth } = {}) {
  if (!opportunity || !opportunity.baseProductId || !opportunity.relatedProductId) {
    throw new Error('A valid opportunity is required to propose an experiment');
  }

  const baseProductExists = await Product.exists({ _id: opportunity.baseProductId });
  const relatedProductExists = await Product.exists({ _id: opportunity.relatedProductId });

  const eligibleCustomerIds = await findEligibleCustomersForProduct(opportunity.baseProductId);
  const activeExperimentExists = await getActiveExperimentForOpportunity(
    opportunity.baseProductId,
    opportunity.relatedProductId,
    strategy,
    auth,
  );

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
      auth,
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
  const assignmentSeed = await generateUniqueAssignmentSeed();
  const selectedAudienceIds = selectAudienceDeterministically(eligibleCustomerIds, finalAudienceSize, assignmentSeed);
  const assignedAudience = assignAudienceDeterministically(selectedAudienceIds, treatmentPercent, assignmentSeed);

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
    ...(auth ? { ...ownershipFilter(auth), expiresAt: auth.mode === 'test' ? auth.expiresAt : null } : {}),
    strategy,
    baseProductId: opportunity.baseProductId,
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
      assignmentMethod: ASSIGNMENT_METHOD,
      assignmentSeed,
      controlAudienceSize: assignedAudience.controlCustomerIds.length,
      treatmentAudienceSize: assignedAudience.treatmentCustomerIds.length,
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
    auth,
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
  auth,
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
    auth,
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
  selectAudienceDeterministically,
};
