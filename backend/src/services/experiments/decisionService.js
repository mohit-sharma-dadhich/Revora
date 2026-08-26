const DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER = 0;
const DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP = 10;

function normalizeDecisionOptions({
  minIncrementalRevenue = DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER,
  minSampleSizePerGroup = DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP,
} = {}) {
  const normalizedMinIncrementalRevenue = Number.isFinite(minIncrementalRevenue)
    ? Number(minIncrementalRevenue)
    : DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER;

  const normalizedMinSampleSizePerGroup = Number.isInteger(minSampleSizePerGroup)
    ? minSampleSizePerGroup
    : DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP;

  return {
    minIncrementalRevenue: normalizedMinIncrementalRevenue,
    minSampleSizePerGroup: normalizedMinSampleSizePerGroup,
  };
}

function decideOutcome({
  incremental,
  control,
  treatment,
  minIncrementalRevenue = DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER,
  minSampleSizePerGroup = DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP,
} = {}) {
  const normalizedOptions = normalizeDecisionOptions({
    minIncrementalRevenue,
    minSampleSizePerGroup,
  });

  const checks = [];

  const sufficientSampleSizePassed = Boolean(
    control && treatment
    && Number.isInteger(control.audienceSize)
    && Number.isInteger(treatment.audienceSize)
    && control.audienceSize >= normalizedOptions.minSampleSizePerGroup
    && treatment.audienceSize >= normalizedOptions.minSampleSizePerGroup
  );

  checks.push({
    name: 'sufficient_sample_size',
    passed: sufficientSampleSizePassed,
    reason: sufficientSampleSizePassed
      ? `Control audience size ${control.audienceSize} and treatment audience size ${treatment.audienceSize} both meet minimum ${normalizedOptions.minSampleSizePerGroup}.`
      : `Control audience size ${control ? control.audienceSize : 0} and treatment audience size ${treatment ? treatment.audienceSize : 0} must each be at least ${normalizedOptions.minSampleSizePerGroup}.`,
  });

  const positiveIncrementalRevenuePassed = Boolean(
    incremental
    && Number.isFinite(incremental.incrementalRevenuePerEligibleCustomer)
    && incremental.incrementalRevenuePerEligibleCustomer > normalizedOptions.minIncrementalRevenue
  );

  checks.push({
    name: 'positive_incremental_revenue',
    passed: positiveIncrementalRevenuePassed,
    reason: positiveIncrementalRevenuePassed
      ? `Incremental revenue per eligible customer ${incremental.incrementalRevenuePerEligibleCustomer} exceeds minimum ${normalizedOptions.minIncrementalRevenue}.`
      : `Incremental revenue per eligible customer ${incremental ? incremental.incrementalRevenuePerEligibleCustomer : 0} does not exceed minimum ${normalizedOptions.minIncrementalRevenue}.`,
  });

  const decision = checks.every((check) => check.passed) ? 'SCALE' : 'STOP';

  return {
    decision,
    checks,
  };
}

module.exports = {
  DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER,
  DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP,
  decideOutcome,
  normalizeDecisionOptions,
};
