const mongoose = require('mongoose');

const agentRunSchema = new mongoose.Schema(
  {
    runType: {
      type: String,
      enum: ['opportunity_discovery', 'experiment_proposal', 'result_analysis'],
      required: true,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
    },
    goal: {
      type: String,
      required: true,
    },
    summary: String,
    finalRecommendation: String,
    error: String,
    steps: [
      {
        stepType: {
          type: String,
          enum: ['analytics_selection', 'data_inspection', 'opportunity_identification', 'ai_reasoning', 'recommendation_generation', 'guardrail_check'],
        },
        toolName: String,
        status: {
          type: String,
          enum: ['pending', 'running', 'completed', 'failed'],
        },
        summary: String,
        inputSummary: mongoose.Schema.Types.Mixed,
        outputSummary: mongoose.Schema.Types.Mixed,
        startedAt: Date,
        completedAt: Date,
        error: String,
      },
    ],
    ownerId: String,
    sessionId: String,
    startedAt: {
      type: Date,
      default: () => new Date(),
    },
    completedAt: Date,
    expiresAt: Date,
  },
  { timestamps: true }
);

// TTL index for test mode
agentRunSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model('AgentRun', agentRunSchema);
