const DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER = 0;
const DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP = 10;
const MIN_CONVERSIONS_PER_GROUP = 2;

function normalizeDecisionOptions({
  minIncrementalRevenue = DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER,
  minSampleSizePerGroup = DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP,
  minConversionsPerGroup = MIN_CONVERSIONS_PER_GROUP,
} = {}) {
  const normalizedMinIncrementalRevenue = Number.isFinite(minIncrementalRevenue)
    ? Number(minIncrementalRevenue)
    : DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER;

  const normalizedMinSampleSizePerGroup = Number.isInteger(minSampleSizePerGroup)
    ? minSampleSizePerGroup
    : DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP;

  const normalizedMinConversionsPerGroup = Number.isInteger(minConversionsPerGroup)
    ? minConversionsPerGroup
    : MIN_CONVERSIONS_PER_GROUP;

  return {
    minIncrementalRevenue: normalizedMinIncrementalRevenue,
    minSampleSizePerGroup: normalizedMinSampleSizePerGroup,
    minConversionsPerGroup: normalizedMinConversionsPerGroup,
  };
}

function decideOutcome({
  incremental,
  control,
  treatment,
  minIncrementalRevenue = DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER,
  minSampleSizePerGroup = DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP,
  minConversionsPerGroup = MIN_CONVERSIONS_PER_GROUP,
} = {}) {
  const normalizedOptions = normalizeDecisionOptions({
    minIncrementalRevenue,
    minSampleSizePerGroup,
    minConversionsPerGroup,
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

  const minimumObservedConversionsPassed = Boolean(
    control && treatment
    && Number.isInteger(control.convertedCustomerCount)
    && Number.isInteger(treatment.convertedCustomerCount)
    && control.convertedCustomerCount >= normalizedOptions.minConversionsPerGroup
    && treatment.convertedCustomerCount >= normalizedOptions.minConversionsPerGroup
  );

  checks.push({
    name: 'minimum_observed_conversions',
    passed: minimumObservedConversionsPassed,
    reason: minimumObservedConversionsPassed
      ? `Control conversions ${control.convertedCustomerCount} and treatment conversions ${treatment.convertedCustomerCount} both meet minimum ${normalizedOptions.minConversionsPerGroup}.`
      : `Control conversions ${control ? control.convertedCustomerCount : 0} and treatment conversions ${treatment ? treatment.convertedCustomerCount : 0} must each be at least ${normalizedOptions.minConversionsPerGroup}.`,
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

  const decision = !sufficientSampleSizePassed || !minimumObservedConversionsPassed
    ? 'INSUFFICIENT_DATA'
    : positiveIncrementalRevenuePassed
      ? 'SCALE'
      : 'STOP';

  return {
    decision,
    checks,
  };
}

module.exports = {
  DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER,
  DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP,
  MIN_CONVERSIONS_PER_GROUP,
  decideOutcome,
  normalizeDecisionOptions,
};
