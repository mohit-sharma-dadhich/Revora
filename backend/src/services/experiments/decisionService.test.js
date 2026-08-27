const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateConversionSignificance, decideOutcome } = require('./decisionService');

function decisionFor({ controlAudience, treatmentAudience, controlConversions, treatmentConversions, incrementalRevenue }) {
  return decideOutcome({
    control: { audienceSize: controlAudience, convertedCustomerCount: controlConversions },
    treatment: { audienceSize: treatmentAudience, convertedCustomerCount: treatmentConversions },
    incremental: { incrementalRevenuePerEligibleCustomer: incrementalRevenue },
  });
}

test('returns insufficient data for small evidence', () => {
  assert.equal(decisionFor({
    controlAudience: 10,
    treatmentAudience: 10,
    controlConversions: 1,
    treatmentConversions: 2,
    incrementalRevenue: 100,
  }).decision, 'INSUFFICIENT_DATA');
});

test('does not scale positive revenue without significant conversion uplift', () => {
  assert.equal(decisionFor({
    controlAudience: 100,
    treatmentAudience: 100,
    controlConversions: 10,
    treatmentConversions: 12,
    incrementalRevenue: 10,
  }).decision, 'INSUFFICIENT_DATA');
});

test('scales significant positive treatment results', () => {
  assert.equal(decisionFor({
    controlAudience: 1000,
    treatmentAudience: 1000,
    controlConversions: 100,
    treatmentConversions: 180,
    incrementalRevenue: 10,
  }).decision, 'SCALE');
});

test('does not scale when significant conversion uplift has negative revenue', () => {
  assert.equal(decisionFor({
    controlAudience: 1000,
    treatmentAudience: 1000,
    controlConversions: 100,
    treatmentConversions: 180,
    incrementalRevenue: -10,
  }).decision, 'STOP');
});

test('stops when treatment conversion rate is significantly lower', () => {
  assert.equal(decisionFor({
    controlAudience: 1000,
    treatmentAudience: 1000,
    controlConversions: 180,
    treatmentConversions: 100,
    incrementalRevenue: 10,
  }).decision, 'STOP');
});

test('returns insufficient data for equal conversion rates', () => {
  assert.equal(decisionFor({
    controlAudience: 1000,
    treatmentAudience: 1000,
    controlConversions: 100,
    treatmentConversions: 100,
    incrementalRevenue: 10,
  }).decision, 'INSUFFICIENT_DATA');
});

test('rejects invalid statistical inputs', () => {
  assert.throws(
    () => calculateConversionSignificance({
      control: { audienceSize: 10, convertedCustomerCount: 11 },
      treatment: { audienceSize: 10, convertedCustomerCount: 1 },
    }),
    /cannot exceed audienceSize/,
  );

  assert.throws(
    () => calculateConversionSignificance({
      control: { audienceSize: -1, convertedCustomerCount: 0 },
      treatment: { audienceSize: 10, convertedCustomerCount: 1 },
    }),
    /audienceSize must be a non-negative integer/,
  );
});

test('safely handles zero conversions and zero standard error', () => {
  const result = calculateConversionSignificance({
    control: { audienceSize: 10, convertedCustomerCount: 0 },
    treatment: { audienceSize: 10, convertedCustomerCount: 0 },
  });

  assert.equal(result.controlConversionRate, 0);
  assert.equal(result.treatmentConversionRate, 0);
  assert.equal(result.zScore, 0);
  assert.equal(result.pValue, 1);
  assert.equal(result.statisticallySignificant, false);
});
