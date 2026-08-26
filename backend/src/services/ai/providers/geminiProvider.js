const { GoogleGenAI } = require('@google/genai');

const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  return new GoogleGenAI({
    apiKey: apiKey.trim(),
  });
}

function getModelName() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

async function generateGeminiContent({ systemPrompt, userPrompt, model } = {}) {
  if (!systemPrompt || !userPrompt) {
    throw new Error('A valid AI request is required');
  }

  const client = getGeminiClient();
  const selectedModel = model || getModelName();

  const response = await client.models.generateContent({
    model: selectedModel,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
    },
  });

  const responseText = response?.text || '';

  if (!responseText || typeof responseText !== 'string') {
    throw new Error('LLM returned no usable text output');
  }

  return responseText.trim();
}

const geminiProvider = {
  name: 'gemini',
  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  },
  async generate({ systemPrompt, userPrompt, model } = {}) {
    return generateGeminiContent({ systemPrompt, userPrompt, model });
  },
};

module.exports = {
  DEFAULT_GEMINI_MODEL,
  generateGeminiContent,
  geminiProvider,
  getGeminiClient,
  getModelName,
};
