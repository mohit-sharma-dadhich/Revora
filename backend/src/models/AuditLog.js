const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    actor: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['SUCCESS', 'FAILED', 'BLOCKED', 'PENDING'],
      default: 'SUCCESS',
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false,
  }
);

auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } });

module.exports = mongoose.model('AuditLog', auditLogSchema);
