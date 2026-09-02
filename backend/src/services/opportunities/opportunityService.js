const AgentRun = require('../../models/AgentRun');
const { createRun, recordStep, completeStep, failStep, completeRun, failRun } = require('../agent/agentRunService');
const { getRankedOpportunities, getRevenueOpportunityWithDiagnostics } = require('./revenueOpportunity');
const { generateRecommendationFromOpportunity } = require('../agent/revenueAgent');

async function safeTrackingStep(label, work) {
  try {
    return await work();
  } catch (error) {
    console.error(label, error);
    return null;
  }
}

async function listOpportunities({ auth, limit = 5 } = {}) {
  const opportunities = await getRankedOpportunities({ auth, limit });

  return {
    opportunities,
  };
}

async function getRecommendationForOpportunity(opportunity) {
  try {
    const recommendation = await generateRecommendationFromOpportunity(opportunity);

    return {
      recommendation,
      aiAvailable: true,
      aiError: null,
    };
  } catch (error) {
    return {
      recommendation: null,
      aiAvailable: false,
      aiError: error.message,
    };
  }
}

async function getOpportunityRecommendation(auth) {
  const ownerId = auth && auth.mode === 'live' ? auth.user?.id : null;
  const sessionId = auth && auth.mode === 'test' ? auth.sessionId : null;
  const expiresAt = auth && auth.mode === 'test' ? auth.expiresAt : null;

  let runId = null;
  try {
    const run = await createRun('opportunity_discovery', 'Discover the best cross-sell opportunity', ownerId, sessionId, expiresAt);
    runId = run && run._id ? run._id.toString() : null;
  } catch (error) {
    console.error('Error creating opportunity discovery run:', error);
  }

  let opportunityDiscoveryStepIndex = null;
  if (runId) {
    try {
      await recordStep(runId, {
        stepType: 'data_inspection',
        toolName: 'productAffinity',
        status: 'running',
        summary: 'Scanning historical orders for co-purchase patterns',
      });

      const run = await AgentRun.findById(runId);
      opportunityDiscoveryStepIndex = run && Array.isArray(run.steps) ? run.steps.length - 1 : -1;
    } catch (error) {
      console.error('Error recording opportunity discovery analysis step:', error);
      opportunityDiscoveryStepIndex = null;
    }
  }

  let opportunity = null;
  let usedPrivateDataOnly = false;
  let diagnostic = {
    audienceBlocked: false,
    bestUnqualifiedAffinity: null,
    bestUnqualifiedBaseCustomers: null,
  };
  try {
    const discovery = await getRevenueOpportunityWithDiagnostics({ auth });
    opportunity = discovery.opportunity;
    usedPrivateDataOnly = discovery.usedPrivateDataOnly;
    diagnostic = discovery.diagnostic;
    if (runId && opportunityDiscoveryStepIndex !== null && opportunityDiscoveryStepIndex >= 0) {
      try {
        await completeStep(runId, opportunityDiscoveryStepIndex);
      } catch (error) {
        console.error('Error completing opportunity discovery analysis step:', error);
      }
    }
  } catch (error) {
    if (runId && opportunityDiscoveryStepIndex !== null && opportunityDiscoveryStepIndex >= 0) {
      try {
        await failStep(runId, opportunityDiscoveryStepIndex, error.message);
      } catch (failStepError) {
        console.error('Error failing opportunity discovery analysis step:', failStepError);
      }
    }
    throw error;
  }

  if (!opportunity) {
    if (runId) {
      await safeTrackingStep('Error completing opportunity discovery run with no opportunity:', async () => {
        await completeRun(runId, null, 'No qualifying opportunity found.');
      });
    }

    return {
      opportunity: null,
      recommendation: null,
      aiAvailable: false,
      aiError: null,
      usedPrivateDataOnly,
      diagnostic,
    };
  }

  let recommendationStepIndex = null;
  if (runId) {
    try {
      await recordStep(runId, {
        stepType: 'ai_reasoning',
        toolName: 'revenueAgent',
        status: 'running',
        summary: 'Asking the LLM to reason about this opportunity',
      });

      const run = await AgentRun.findById(runId);
      recommendationStepIndex = run && Array.isArray(run.steps) ? run.steps.length - 1 : -1;
    } catch (error) {
      console.error('Error recording recommendation step:', error);
      recommendationStepIndex = null;
    }
  }

  try {
    const result = await getRecommendationForOpportunity(opportunity);

    if (runId && recommendationStepIndex !== null && recommendationStepIndex >= 0) {
      try {
        await completeStep(runId, recommendationStepIndex);
      } catch (error) {
        console.error('Error completing recommendation step:', error);
      }
    }

    if (runId) {
      try {
        await completeRun(runId, result.recommendation, 'Recommendation generated.');
      } catch (error) {
        console.error('Error completing opportunity discovery run:', error);
      }
    }

    return {
      opportunity,
      recommendation: result.recommendation,
      aiAvailable: result.aiAvailable,
      aiError: result.aiError,
    };
  } catch (error) {
    if (runId && recommendationStepIndex !== null && recommendationStepIndex >= 0) {
      try {
        await failStep(runId, recommendationStepIndex, error.message);
      } catch (failStepError) {
        console.error('Error failing recommendation step:', failStepError);
      }
    }

    if (runId) {
      try {
        await failRun(runId, error.message);
      } catch (failRunError) {
        console.error('Error failing opportunity discovery run:', failRunError);
      }
    }

    return {
      opportunity,
      recommendation: null,
      aiAvailable: false,
      aiError: error.message,
    };
  }
}

module.exports = {
  getOpportunityRecommendation,
  listOpportunities,
  getRecommendationForOpportunity,
};
