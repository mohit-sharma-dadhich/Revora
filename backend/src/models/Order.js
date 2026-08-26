const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
    ],
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be a non-negative integer in paise',
      },
    },
    source: {
      type: String,
      required: true,
      enum: ['historical', 'experiment'],
      default: 'historical',
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'completed', 'failed', 'cancelled'],
      default: 'completed',
    },
    experimentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experiment',
      default: null,
    },
    experimentGroup: {
      type: String,
      enum: ['control', 'treatment'],
      default: null,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ customerId: 1 });
orderSchema.index({ productIds: 1 });
orderSchema.index({ source: 1, createdAt: -1 });
orderSchema.index({ experimentId: 1, customerId: 1, source: 1 });

module.exports = mongoose.model('Order', orderSchema);
