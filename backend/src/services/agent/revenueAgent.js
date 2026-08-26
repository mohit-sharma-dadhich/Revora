const { GoogleGenAI } = require('@google/genai');
const { getRevenueOpportunity } = require('../opportunities/revenueOpportunity');

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

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

function normalizeAgentEvidence(opportunity) {
  if (!opportunity || typeof opportunity !== 'object') {
    throw new Error('A valid opportunity object is required');
  }

  const requiredFields = [
    'baseProductId',
    'relatedProductId',
    'baseCustomerCount',
    'coPurchaseCustomerCount',
    'affinity',
    'estimatedEligibleCustomers',
    'opportunityScore',
  ];

  for (const field of requiredFields) {
    if (!(field in opportunity)) {
      throw new Error(`Missing required opportunity field: ${field}`);
    }
  }

  return {
    baseProductId: String(opportunity.baseProductId),
    relatedProductId: String(opportunity.relatedProductId),
    baseCustomerCount: Number(opportunity.baseCustomerCount),
    coPurchaseCustomerCount: Number(opportunity.coPurchaseCustomerCount),
    affinity: Number(opportunity.affinity),
    estimatedEligibleCustomers: Number(opportunity.estimatedEligibleCustomers),
    opportunityScore: Number(opportunity.opportunityScore),
  };
}

function buildSystemPrompt() {
  return [
    'You are a revenue-growth reasoning assistant for a merchant cross-sell workflow.',
    'You must use the provided application-generated evidence as the source of truth.',
    'Do not alter, recalculate, or invent any factual values from the opportunity object.',
    'Do not invent missing customer counts, product IDs, affinity values, or revenue numbers.',
    'If the evidence is insufficient, say so clearly in the recommendation or reasoning.',
    'Your job is to interpret the evidence and suggest the next action in plain language.',
    'Never say that you created or measured a business result that was not supplied by the application.',
  ].join(' ');
}

function buildUserPrompt(evidence) {
  return JSON.stringify({
    facts: {
      baseProductId: evidence.baseProductId,
      relatedProductId: evidence.relatedProductId,
      baseCustomerCount: evidence.baseCustomerCount,
      coPurchaseCustomerCount: evidence.coPurchaseCustomerCount,
      affinity: evidence.affinity,
      estimatedEligibleCustomers: evidence.estimatedEligibleCustomers,
      opportunityScore: evidence.opportunityScore,
    },
    instructions: [
      'These values are authoritative application-generated evidence.',
      'Do not alter or recalculate them.',
      'Do not invent missing information.',
      'If evidence is insufficient, explain that clearly.',
      'Respond with valid JSON only.',
      'Keep the recommendation limited to the current cross-sell opportunity and do not execute any experiment or payment.',
    ],
  }, null, 2);
}

function validateResponse(response) {
  if (!response || typeof response !== 'object') {
    throw new Error('LLM response must be an object');
  }

  const recommendation = response.recommendation;
  const reasoning = response.reasoning;
  const confidence = response.confidence;
  const evidence = response.evidence;

  if (typeof recommendation !== 'string' || !recommendation.trim()) {
    throw new Error('LLM response is missing a valid recommendation');
  }

  if (typeof reasoning !== 'string' || !reasoning.trim()) {
    throw new Error('LLM response is missing valid reasoning');
  }

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('LLM response confidence must be a number between 0 and 1');
  }

  if (!evidence || typeof evidence !== 'object') {
    throw new Error('LLM response is missing evidence object');
  }

  const requiredEvidenceFields = ['baseProductId', 'relatedProductId', 'affinity', 'eligibleCustomers', 'opportunityScore'];
  for (const field of requiredEvidenceFields) {
    if (!(field in evidence)) {
      throw new Error(`LLM evidence is missing: ${field}`);
    }
  }

  return {
    recommendation: recommendation.trim(),
    reasoning: reasoning.trim(),
    confidence: Number(confidence),
    evidence: {
      baseProductId: String(evidence.baseProductId),
      relatedProductId: String(evidence.relatedProductId),
      affinity: Number(evidence.affinity),
      eligibleCustomers: Number(evidence.eligibleCustomers),
      opportunityScore: Number(evidence.opportunityScore),
    },
  };
}

function ensureMachineMatchesApplication(response, evidence) {
  if (String(response.evidence.baseProductId) !== String(evidence.baseProductId)) {
    throw new Error('baseProductId mismatch between application evidence and LLM evidence');
  }

  if (String(response.evidence.relatedProductId) !== String(evidence.relatedProductId)) {
    throw new Error('relatedProductId mismatch between application evidence and LLM evidence');
  }

  if (Number(response.evidence.affinity) !== Number(evidence.affinity)) {
    throw new Error('affinity mismatch between application evidence and LLM evidence');
  }

  if (Number(response.evidence.eligibleCustomers) !== Number(evidence.estimatedEligibleCustomers)) {
    throw new Error('eligibleCustomers mismatch between application evidence and LLM evidence');
  }

  if (Number(response.evidence.opportunityScore) !== Number(evidence.opportunityScore)) {
    throw new Error('opportunityScore mismatch between application evidence and LLM evidence');
  }
}

async function generateRecommendationFromOpportunity(opportunity) {
  if (!opportunity) {
    throw new Error('No valid revenue opportunity was found');
  }

  const evidence = normalizeAgentEvidence(opportunity);
  const client = getGeminiClient();
  const model = getModelName();

  const response = await client.models.generateContent({
    model,
    contents: buildUserPrompt(evidence),
    config: {
      systemInstruction: buildSystemPrompt(),
      responseMimeType: 'application/json',
    },
  });

  const responseText = response?.text || '';

  if (!responseText || typeof responseText !== 'string') {
    throw new Error('LLM returned no usable text output');
  }

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    throw new Error(`LLM returned invalid JSON: ${error.message}`);
  }

  const validated = validateResponse(parsed);
  ensureMachineMatchesApplication(validated, evidence);

  return {
    facts: {
      baseProductId: evidence.baseProductId,
      relatedProductId: evidence.relatedProductId,
      baseCustomerCount: evidence.baseCustomerCount,
      coPurchaseCustomerCount: evidence.coPurchaseCustomerCount,
      affinity: evidence.affinity,
      estimatedEligibleCustomers: evidence.estimatedEligibleCustomers,
      opportunityScore: evidence.opportunityScore,
    },
    reasoning: validated.reasoning,
    recommendation: validated.recommendation,
    confidence: validated.confidence,
    evidence: validated.evidence,
  };
}

async function runRevenueAgent() {
  const opportunity = await getRevenueOpportunity();

  if (!opportunity) {
    throw new Error('No valid revenue opportunity was found');
  }

  return generateRecommendationFromOpportunity(opportunity);
}

module.exports = {
  DEFAULT_GEMINI_MODEL,
  buildSystemPrompt,
  buildUserPrompt,
  ensureMachineMatchesApplication,
  generateRecommendationFromOpportunity,
  getGeminiClient,
  getModelName,
  normalizeAgentEvidence,
  runRevenueAgent,
  validateResponse,
};
