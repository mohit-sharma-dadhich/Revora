const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
]);
const RETRYABLE_MESSAGES = [
  'timeout',
  'timed out',
  'rate limit',
  'too many requests',
  'service unavailable',
  'temporarily unavailable',
  'overloaded',
  'internal server error',
  'bad gateway',
  'gateway timeout',
  'unavailable',
];

function getErrorDetails(error) {
  const status = Number(
    error?.status
      ?? error?.response?.status
      ?? error?.cause?.status
      ?? error?.details?.status
      ?? 0,
  );
  const code = error?.code || error?.cause?.code || error?.details?.code || error?.error?.code || '';
  const message = String(
    error?.message
      || error?.cause?.message
      || error?.response?.data?.error?.message
      || error?.error?.message
      || '',
  );

  return {
    status: Number.isFinite(status) && status > 0 ? status : null,
    code: code || '',
    message,
  };
}

function classifyAIError(error, providerName = 'unknown') {
  const details = getErrorDetails(error);
  const lowerMessage = details.message.toLowerCase();

  const hasMissingApiKey = /api[_ -]?key.*missing|missing.*api[_ -]?key/i.test(details.message)
    || /api[_ -]?key.*required|key.*is missing/i.test(details.message);
  const hasInvalidApiKey = /(invalid|unauthorized|forbidden|authentication).*api[_ -]?key|api[_ -]?key.*(invalid|unauthorized|forbidden)/i.test(details.message)
    || details.status === 401
    || details.status === 403;
  const hasUnsupportedModel = /unsupported model|model.*not.*found|not supported|model.*unsupported/i.test(details.message);
  const hasMalformedApplicationRequest = /malformed application request|invalid application request|no valid revenue opportunity|missing required opportunity field|llm response.*missing|llm response.*invalid|application.*validation/i.test(details.message);
  const hasMalformedAiResponse = /llm returned invalid json|llm returned no usable text output|llm response.*missing|llm evidence.*missing|mismatch between application evidence and llm evidence/i.test(details.message);
  const isRetryableStatus = details.status !== null && RETRYABLE_STATUS_CODES.has(details.status);
  const isRetryableCode = !!details.code && RETRYABLE_CODES.has(details.code);
  const matchesRetryableMessage = RETRYABLE_MESSAGES.some((token) => lowerMessage.includes(token));

  if (hasMissingApiKey || hasInvalidApiKey || hasUnsupportedModel || hasMalformedApplicationRequest || hasMalformedAiResponse) {
    return {
      provider: providerName,
      providerName,
      category: 'non-retryable',
      retryable: false,
      status: details.status,
      code: details.code,
      message: details.message,
    };
  }

  if (isRetryableStatus || isRetryableCode || matchesRetryableMessage) {
    return {
      provider: providerName,
      providerName,
      category: 'retryable',
      retryable: true,
      status: details.status,
      code: details.code,
      message: details.message,
    };
  }

  return {
    provider: providerName,
    providerName,
    category: 'non-retryable',
    retryable: false,
    status: details.status,
    code: details.code,
    message: details.message,
  };
}

function isRetryableAIError(error, providerName = 'unknown') {
  return classifyAIError(error, providerName).retryable;
}

function isNonRetryableAIError(error, providerName = 'unknown') {
  return !isRetryableAIError(error, providerName);
}

module.exports = {
  classifyAIError,
  isRetryableAIError,
  isNonRetryableAIError,
};
