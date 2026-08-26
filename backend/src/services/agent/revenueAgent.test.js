const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSystemPrompt,
  buildUserPrompt,
  validateResponse,
} = require('./revenueAgent');

const evidence = {
  baseProductId: 'product-1',
  relatedProductId: 'product-2',
  baseCustomerCount: 20,
  coPurchaseCustomerCount: 10,
  affinity: 0.5,
  estimatedEligibleCustomers: 10,
  opportunityScore: 7,
};

const validResponse = {
  recommendation: 'Offer product-2 to eligible product-1 customers.',
  reasoning: 'The observed affinity and eligible customer count support a targeted cross-sell.',
  confidence: 0.8,
  evidence: {
    baseProductId: 'product-1',
    relatedProductId: 'product-2',
    affinity: 0.5,
    eligibleCustomers: 10,
    opportunityScore: 7,
  },
};

test('prompts define the strict recommendation response contract', () => {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(evidence);

  for (const field of ['recommendation', 'reasoning', 'confidence', 'evidence']) {
    assert.match(systemPrompt, new RegExp(`\\b${field}\\b`));
    assert.match(userPrompt, new RegExp(`\\b${field}\\b`));
  }

  assert.match(userPrompt, /estimatedEligibleCustomers/);
  assert.match(userPrompt, /eligibleCustomers/);
});

test('strict validation accepts the required LLM response shape', () => {
  assert.deepEqual(validateResponse(validResponse), validResponse);
});

test('strict validation rejects a response without reasoning', () => {
  const response = { ...validResponse };
  delete response.reasoning;

  assert.throws(
    () => validateResponse(response),
    /LLM response is missing valid reasoning/,
  );
});

test('strict validation rejects missing evidence fields', () => {
  const response = {
    ...validResponse,
    evidence: { ...validResponse.evidence },
  };
  delete response.evidence.eligibleCustomers;

  assert.throws(
    () => validateResponse(response),
    /LLM evidence is missing: eligibleCustomers/,
  );
});
