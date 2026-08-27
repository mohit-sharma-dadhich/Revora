const mongoose = require('mongoose');

const experimentSchema = new mongoose.Schema(
  {
    strategy: {
      type: String,
      required: true,
      enum: ['CROSS_SELL'],
      default: 'CROSS_SELL',
    },
    baseProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    targetProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'pending', 'running', 'completed', 'cancelled', 'blocked'],
      default: 'draft',
    },
    controlCustomerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
      },
    ],
    treatmentCustomerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
      },
    ],
    startAt: {
      type: Date,
      default: null,
    },
    endAt: {
      type: Date,
      default: null,
    },
    results: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    decision: {
      type: String,
      enum: ['PENDING', 'SCALE', 'STOP', 'INSUFFICIENT_DATA'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

experimentSchema.pre('validate', function (next) {
  if (this.startAt && this.endAt && this.startAt > this.endAt) {
    next(new Error('startAt cannot be after endAt'));
    return;
  }

  next();
});

module.exports = mongoose.model('Experiment', experimentSchema);
