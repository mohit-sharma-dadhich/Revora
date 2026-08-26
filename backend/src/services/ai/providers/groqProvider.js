const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';

function getGroqApiKey() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('GROQ_API_KEY is missing');
  }

  return apiKey.trim();
}

function getModelName() {
  return process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
}

function normalizeGroqResponse(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }

  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  throw new Error('Groq returned no usable text output');
}

async function generateGroqContent({ systemPrompt, userPrompt, model } = {}) {
  if (!systemPrompt || !userPrompt) {
    throw new Error('A valid AI request is required');
  }

  const apiKey = getGroqApiKey();
  const selectedModel = getModelName();

  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
  } catch (error) {
    const normalized = new Error(`Groq request failed: ${error.message}`);
    normalized.code = error.code || '';
    normalized.status = error.status || null;
    throw normalized;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    const normalized = new Error('Groq returned invalid JSON');
    normalized.status = response.status;
    normalized.code = 'INVALID_JSON';
    throw normalized;
  }

  if (!response.ok) {
    const message = payload?.error?.message || 'Groq request failed';
    const normalized = new Error(message);
    normalized.status = response.status;
    normalized.code = payload?.error?.code || '';
    throw normalized;
  }

  return normalizeGroqResponse(payload);
}

const groqProvider = {
  name: 'groq',
  isConfigured() {
    return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
  },
  async generate({ systemPrompt, userPrompt, model } = {}) {
    return generateGroqContent({ systemPrompt, userPrompt, model });
  },
};

module.exports = {
  DEFAULT_GROQ_MODEL,
  generateGroqContent,
  getGroqApiKey,
  getModelName,
  groqProvider,
  normalizeGroqResponse,
};
