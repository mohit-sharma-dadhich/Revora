const { classifyAIError } = require('./errorClassifier');
const { geminiProvider } = require('./providers/geminiProvider');
const { groqProvider } = require('./providers/groqProvider');

function getConfiguredProviderOrder() {
  const configured = (process.env.AI_PROVIDER_ORDER || 'gemini')
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);

  if (!configured.length) {
    return ['gemini'];
  }

  return [...new Set(configured)];
}

function getProviderByName(providerName) {
  const providers = {
    gemini: geminiProvider,
    groq: groqProvider,
  };

  return providers[providerName] || null;
}

async function routeProviderRequest(requestContext = {}) {
  const providerOrder = getConfiguredProviderOrder();

  let lastError = new Error('AI provider unavailable');

  for (const providerName of providerOrder) {
    const provider = getProviderByName(providerName);

    if (!provider) {
      const error = new Error(`Unsupported AI provider configured: ${providerName}`);
      throw error;
    }

    if (typeof provider.isConfigured === 'function' && !provider.isConfigured()) {
      const error = new Error(`${providerName.toUpperCase()} provider is not configured`);
      const classification = classifyAIError(error, providerName);

      if (!classification.retryable) {
        throw error;
      }

      lastError = error;
      continue;
    }

    console.warn('[AI] provider attempted', { provider: providerName, category: 'attempt' });

    try {
      const output = await provider.generate(requestContext);
      console.warn('[AI] provider succeeded', { provider: providerName, category: 'success' });
      return {
        provider: providerName,
        output,
      };
    } catch (error) {
      const classification = classifyAIError(error, providerName);
      console.warn('[AI] provider failed', {
        provider: providerName,
        category: classification.category,
        retryable: classification.retryable,
        status: classification.status,
      });

      lastError = error;

      if (!classification.retryable) {
        throw error;
      }
    }
  }

  throw lastError;
}

module.exports = {
  getConfiguredProviderOrder,
  getProviderByName,
  routeProviderRequest,
};
