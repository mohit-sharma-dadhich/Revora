const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyAIError, isRetryableAIError, isNonRetryableAIError } = require('./errorClassifier');

test('classifies 429 as retryable', () => {
  const result = classifyAIError({ status: 429, message: 'rate limit exceeded' }, 'gemini');
  assert.equal(result.retryable, true);
  assert.equal(result.category, 'retryable');
});

test('classifies 401 as non-retryable', () => {
  const result = classifyAIError({ status: 401, message: 'unauthorized' }, 'gemini');
  assert.equal(result.retryable, false);
  assert.equal(result.category, 'non-retryable');
});

test('classifies missing API key as non-retryable', () => {
  const result = classifyAIError(new Error('GEMINI_API_KEY is missing'), 'gemini');
  assert.equal(isRetryableAIError(result), false);
  assert.equal(isNonRetryableAIError(result), true);
});
