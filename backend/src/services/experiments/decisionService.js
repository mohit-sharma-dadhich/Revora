const DEFAULT_MIN_INCREMENTAL_REVENUE_PER_CUSTOMER = 0;
const DEFAULT_MIN_SAMPLE_SIZE_PER_GROUP = 10;
const MIN_CONVERSIONS_PER_GROUP = 2;
const DEFAULT_SIGNIFICANCE_ALPHA = 0.05;

function standardNormalCdf(value) {
  const sign = value < 0 ? -1 : 1;
  const absoluteValue = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absoluteValue);
  const polynomial = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-absoluteValue * absoluteValue);
  return 0.5 * (1 + sign * polynomial);
}

function validateConversionInput(groupName, group) {
  if (!group || !Number.isInteger(group.audienceSize) || group.audienceSize < 0) {
    throw new Error(`${groupName} audienceSize must be a non-negative integer`);
  }

  if (!Number.isInteger(group.convertedCustomerCount) || group.convertedCustomerCount < 0) {
    throw new Error(`${groupName} convertedCustomerCount must be a non-negative integer`);
  }

  if (group.convertedCustomerCount > group.audienceSize) {
    throw new Error(`${groupName} convertedCustomerCount cannot exceed audienceSize`);
  }
}

function calculateConversionSignificance({ control, treatment, alpha = DEFAULT_SIGNIFICANCE_ALPHA } = {}) {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('alpha must be a number between 0 and 1');
  }

  validateConversionInput('Control', control);
  validateConversionInput('Treatment', treatment);

  const controlSampleSize = control.audienceSize;
  const treatmentSampleSize = treatment.audienceSize;
  const controlConversions = control.convertedCustomerCount;
  const treatmentConversions = treatment.convertedCustomerCount;
  const controlConversionRate = controlSampleSize > 0 ? controlConversions / controlSampleSize : 0;
  const treatmentConversionRate = treatmentSampleSize > 0 ? treatmentConversions / treatmentSampleSize : 0;
  const conversionRateUplift = treatmentConversionRate - controlConversionRate;
  const pooledConversionRate = controlSampleSize + treatmentSampleSize > 0
    ? (controlConversions + treatmentConversions) / (controlSampleSize + treatmentSampleSize)
    : 0;
  const standardError = Math.sqrt(
    pooledConversionRate
    * (1 - pooledConversionRate)
    * ((controlSampleSize > 0 ? 1 / controlSampleSize : 0) + (treatmentSampleSize > 0 ? 1 / treatmentSampleSize : 0))
  );
  const zScore = standardError === 0 ? 0 : conversionRateUplift / standardError;
  const pValue = standardError === 0
    ? 1
    : 2 * (1 - standardNormalCdf(Math.abs(zScore)));
  const statisticallySignificant = conversionRateUplift !== 0 && pValue < alpha;

  return {
    controlSampleSize,
    treatmentSampleSize,
    controlConversions,
    treatmentConversions,
    controlConversionRate,
    treatmentConversionRate,
    conversionRateUplift,
    zScore,
    pValue,
    alpha,
    treatmentConversionHigher: conversionRateUplift > 0,
    treatmentSignificantlyWorse: conversionRateUplift < 0 && statisticallySignificant,
    statisticallySignificant,
  };
}

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

  const significance = calculateConversionSignificance({
    control,
    treatment,
  });

  checks.push({
    name: 'conversion_rate_uplift',
    passed: significance.treatmentConversionHigher,
    reason: significance.treatmentConversionHigher
      ? `Treatment conversion rate ${(significance.treatmentConversionRate * 100).toFixed(2)}% is higher than control at ${(significance.controlConversionRate * 100).toFixed(2)}%.`
      : `Treatment conversion rate ${(significance.treatmentConversionRate * 100).toFixed(2)}% is not higher than control at ${(significance.controlConversionRate * 100).toFixed(2)}%.`,
    metrics: {
      control: significance.controlConversionRate,
      treatment: significance.treatmentConversionRate,
      uplift: significance.conversionRateUplift,
    },
  });

  checks.push({
    name: 'statistical_significance',
    passed: significance.statisticallySignificant,
    reason: significance.statisticallySignificant
      ? `Treatment conversion improvement is statistically significant at alpha ${significance.alpha}.`
      : `Conversion difference is not statistically significant at alpha ${significance.alpha}; more evidence is required before scaling.`,
    metrics: {
      alpha: significance.alpha,
      zScore: significance.zScore,
      pValue: significance.pValue,
    },
  });

  const sufficientEvidence = sufficientSampleSizePassed && minimumObservedConversionsPassed;
  const decision = !sufficientEvidence
    ? 'INSUFFICIENT_DATA'
    : significance.treatmentSignificantlyWorse
      ? 'STOP'
      : !significance.statisticallySignificant || !significance.treatmentConversionHigher
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
  DEFAULT_SIGNIFICANCE_ALPHA,
  MIN_CONVERSIONS_PER_GROUP,
  calculateConversionSignificance,
  decideOutcome,
  normalizeDecisionOptions,
};
