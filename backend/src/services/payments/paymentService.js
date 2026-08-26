const crypto = require('crypto');

const Order = require('../../models/Order');
const Customer = require('../../models/Customer');
const Product = require('../../models/Product');
const Experiment = require('../../models/Experiment');
const AuditLog = require('../../models/AuditLog');
const { createRazorpayService } = require('../razorpay/razorpayService');

function isObjectIdLike(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function logPaymentAudit({ action, status, reason, metadata = {} }) {
  await AuditLog.create({
    actor: 'system',
    action,
    status,
    reason: reason || null,
    metadata,
  });
}

async function validateExperimentCustomerAndProduct({ experimentId, customerId }) {
  if (!isObjectIdLike(experimentId)) {
    throw new Error('Experiment identifier is required.');
  }

  if (!isObjectIdLike(customerId)) {
    throw new Error('Customer identifier is required.');
  }

  const experiment = await Experiment.findById(experimentId).lean();

  if (!experiment) {
    throw new Error('Experiment not found.');
  }

  if (experiment.status !== 'running') {
    throw new Error('Experiment is not running.');
  }

  const customer = await Customer.findById(customerId).lean();

  if (!customer) {
    throw new Error('Customer not found.');
  }

  const normalizedControl = (experiment.controlCustomerIds || []).map((id) => id.toString());
  const normalizedTreatment = (experiment.treatmentCustomerIds || []).map((id) => id.toString());

  const belongsToControl = normalizedControl.includes(customerId.toString());
  const belongsToTreatment = normalizedTreatment.includes(customerId.toString());

  if (belongsToControl && belongsToTreatment) {
    throw new Error('Customer belongs to both control and treatment groups.');
  }

  if (!belongsToControl && !belongsToTreatment) {
    throw new Error('Customer is not assigned to this experiment.');
  }

  const experimentGroup = belongsToControl ? 'control' : 'treatment';
  const targetProductId = experiment.targetProductId ? experiment.targetProductId.toString() : null;

  if (!targetProductId) {
    throw new Error('Experiment target product is missing.');
  }

  const product = await Product.findById(targetProductId).lean();

  if (!product) {
    throw new Error('Experiment target product could not be found.');
  }

  return {
    experiment,
    customer,
    experimentGroup,
    targetProductId,
    product,
  };
}

async function createExperimentOrder({ experimentId, customerId }) {
  const { experiment, experimentGroup, targetProductId, product } = await validateExperimentCustomerAndProduct({
    experimentId,
    customerId,
  });

  const existingOrder = await Order.findOne({
    experimentId,
    customerId,
    source: 'experiment',
    status: { $in: ['pending', 'paid'] },
  }).sort({ createdAt: -1 }).lean();

  if (existingOrder) {
    throw new Error('An experiment payment order already exists for this customer and experiment.');
  }

  const orderDocument = await Order.create({
    customerId,
    productIds: [targetProductId],
    amount: product.price,
    source: 'experiment',
    status: 'pending',
    experimentId,
    experimentGroup,
  });

  const razorpayService = createRazorpayService();
  const receipt = `revora_exp_${orderDocument._id.toString()}`;

  const razorpayOrder = await razorpayService.createTestOrder({
    amount: product.price,
    currency: 'INR',
    receipt,
    notes: {
      experimentId: experiment._id.toString(),
      customerId: customer._id.toString(),
      experimentGroup,
      targetProductId,
    },
  });

  orderDocument.razorpayOrderId = razorpayOrder.id;
  await orderDocument.save();

  await logPaymentAudit({
    action: 'PAYMENT_ORDER_CREATED',
    status: 'SUCCESS',
    reason: 'Experiment order created and Razorpay order issued.',
    metadata: {
      experimentId,
      customerId,
      experimentGroup,
      targetProductId,
      orderId: orderDocument._id.toString(),
      razorpayOrderId: razorpayOrder.id,
      amount: product.price,
    },
  });

  return {
    orderId: razorpayOrder.id,
    amount: product.price,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    experimentId,
    group: experimentGroup,
    orderDocumentId: orderDocument._id.toString(),
  };
}

function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret || !keySecret.trim()) {
    throw new Error('RAZORPAY_KEY_SECRET is missing.');
  }

  const digest = crypto
    .createHmac('sha256', keySecret.trim())
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (digest !== razorpaySignature) {
    throw new Error('Invalid Razorpay signature.');
  }
}

async function verifyExperimentPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new Error('Razorpay order ID, payment ID, and signature are required.');
  }

  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id }).lean();

  if (!order) {
    throw new Error('Payment order not found.');
  }

  try {
    verifyRazorpaySignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });
  } catch (error) {
    await logPaymentAudit({
      action: 'PAYMENT_VERIFICATION_FAILED',
      status: 'FAILED',
      reason: error.message,
      metadata: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        experimentId: order.experimentId ? order.experimentId.toString() : null,
        customerId: order.customerId ? order.customerId.toString() : null,
        experimentGroup: order.experimentGroup || null,
      },
    });

    throw new Error(error.message);
  }

  if (order.status === 'paid' && order.razorpayPaymentId === razorpay_payment_id) {
    return {
      success: true,
      data: {
        orderId: order.razorpayOrderId,
        paymentId: order.razorpayPaymentId,
        status: order.status,
        experimentId: order.experimentId ? order.experimentId.toString() : null,
        customerId: order.customerId ? order.customerId.toString() : null,
        group: order.experimentGroup || null,
      },
    };
  }

  const persistedOrder = await Order.findById(order._id);

  if (persistedOrder.status === 'paid' && persistedOrder.razorpayPaymentId === razorpay_payment_id) {
    return {
      success: true,
      data: {
        orderId: persistedOrder.razorpayOrderId,
        paymentId: persistedOrder.razorpayPaymentId,
        status: persistedOrder.status,
        experimentId: persistedOrder.experimentId ? persistedOrder.experimentId.toString() : null,
        customerId: persistedOrder.customerId ? persistedOrder.customerId.toString() : null,
        group: persistedOrder.experimentGroup || null,
      },
    };
  }

  persistedOrder.razorpayPaymentId = razorpay_payment_id;
  persistedOrder.status = 'paid';
  await persistedOrder.save();

  await logPaymentAudit({
    action: 'PAYMENT_VERIFIED',
    status: 'SUCCESS',
    reason: 'Razorpay signature verified and order marked paid.',
    metadata: {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      experimentId: persistedOrder.experimentId ? persistedOrder.experimentId.toString() : null,
      customerId: persistedOrder.customerId ? persistedOrder.customerId.toString() : null,
      experimentGroup: persistedOrder.experimentGroup || null,
      orderId: persistedOrder._id.toString(),
    },
  });

  return {
    success: true,
    data: {
      orderId: persistedOrder.razorpayOrderId,
      paymentId: persistedOrder.razorpayPaymentId,
      status: persistedOrder.status,
      experimentId: persistedOrder.experimentId ? persistedOrder.experimentId.toString() : null,
      customerId: persistedOrder.customerId ? persistedOrder.customerId.toString() : null,
      group: persistedOrder.experimentGroup || null,
    },
  };
}

module.exports = {
  createExperimentOrder,
  verifyExperimentPayment,
};
