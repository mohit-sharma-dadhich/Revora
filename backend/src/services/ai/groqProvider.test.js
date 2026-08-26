const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeGroqResponse, getModelName, generateGroqContent } = require('./providers/groqProvider');

test('normalizes a standard Groq chat content payload', () => {
  const output = normalizeGroqResponse({
    choices: [{
      message: {
        content: '{"recommendation":"Test","reasoning":"Reason","confidence":0.8,"evidence":{"baseProductId":"1","relatedProductId":"2","affinity":0.5,"eligibleCustomers":10,"opportunityScore":7}}',
      },
    }],
  });

  assert.equal(output.includes('"recommendation"'), true);
  assert.equal(output.includes('"confidence"'), true);
});

test('returns the configured Groq model default', () => {
  process.env.GROQ_MODEL = '';
  assert.equal(getModelName(), 'openai/gpt-oss-20b');
});

test('ignores Gemini model names when calling Groq', async () => {
  const originalApiKey = process.env.GROQ_API_KEY;
  const originalGroqModel = process.env.GROQ_MODEL;

  process.env.GROQ_API_KEY = 'test-groq-key';
  process.env.GROQ_MODEL = 'openai/gpt-oss-20b';

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'openai/gpt-oss-20b');
    assert.notEqual(body.model, 'gemini-flash-latest');

    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: '{"recommendation":"Groq test","reasoning":"Reason","confidence":0.9,"evidence":{"baseProductId":"1","relatedProductId":"2","affinity":0.5,"eligibleCustomers":10,"opportunityScore":7}}',
          },
        }],
      }),
    };
  };

  try {
    const output = await generateGroqContent({
      systemPrompt: 'test system prompt',
      userPrompt: 'test user prompt',
      model: 'gemini-flash-latest',
    });

    assert.match(output, /"recommendation":"Groq test"/);
  } finally {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalApiKey;
    if (originalGroqModel === undefined) delete process.env.GROQ_MODEL; else process.env.GROQ_MODEL = originalGroqModel;
  }
});
