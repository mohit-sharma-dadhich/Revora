const AgentRun = require('../../models/AgentRun');

async function createRun(runType, goal, ownerId, sessionId, expiresAt) {
  const isTestMode = ownerId == null && sessionId != null;
  
  const run = new AgentRun({
    runType,
    status: 'running',
    goal,
    ownerId,
    sessionId,
    expiresAt: isTestMode ? expiresAt : null,
    steps: [],
  });
  
  await run.save();
  return run;
}

async function recordStep(runId, stepData) {
  const { stepType, toolName, status, summary, inputSummary, outputSummary, error } = stepData;
  
  const run = await AgentRun.findById(runId);
  if (!run) {
    throw new Error(`AgentRun ${runId} not found`);
  }
  
  const step = {
    stepType,
    toolName,
    status,
    summary,
    inputSummary,
    outputSummary,
    error,
    startedAt: new Date(),
  };
  
  run.steps.push(step);
  await run.save();
  
  return step;
}

async function completeStep(runId, stepIndex) {
  const run = await AgentRun.findById(runId);
  if (!run) {
    throw new Error(`AgentRun ${runId} not found`);
  }
  
  if (run.steps[stepIndex]) {
    run.steps[stepIndex].completedAt = new Date();
    run.steps[stepIndex].status = 'completed';
  }
  
  await run.save();
}

async function failStep(runId, stepIndex, error) {
  const run = await AgentRun.findById(runId);
  if (!run) {
    throw new Error(`AgentRun ${runId} not found`);
  }
  
  if (run.steps[stepIndex]) {
    run.steps[stepIndex].completedAt = new Date();
    run.steps[stepIndex].status = 'failed';
    run.steps[stepIndex].error = error;
  }
  
  await run.save();
}

async function completeRun(runId, finalRecommendation, summary) {
  const run = await AgentRun.findById(runId);
  if (!run) {
    throw new Error(`AgentRun ${runId} not found`);
  }
  
  run.status = 'completed';
  run.completedAt = new Date();
  run.finalRecommendation = finalRecommendation;
  run.summary = summary;
  
  await run.save();
  return run;
}

async function failRun(runId, error) {
  const run = await AgentRun.findById(runId);
  if (!run) {
    throw new Error(`AgentRun ${runId} not found`);
  }
  
  run.status = 'failed';
  run.completedAt = new Date();
  run.error = error;
  
  await run.save();
  return run;
}

async function getRunById(runId, ownerId, sessionId) {
  const query = { _id: runId };
  
  if (ownerId != null) {
    query.ownerId = ownerId;
  } else if (sessionId != null) {
    query.sessionId = sessionId;
  } else {
    throw new Error('A valid session is required.');
  }
  
  return AgentRun.findOne(query).lean();
}

async function getLatestRun(runType, ownerId, sessionId) {
  const query = { runType };
  
  if (ownerId != null) {
    query.ownerId = ownerId;
  } else if (sessionId != null) {
    query.sessionId = sessionId;
  } else {
    throw new Error('A valid session is required.');
  }
  
  return AgentRun.findOne(query).sort({ createdAt: -1 }).lean();
}

module.exports = {
  createRun,
  recordStep,
  completeStep,
  failStep,
  completeRun,
  failRun,
  getRunById,
  getLatestRun,
};
