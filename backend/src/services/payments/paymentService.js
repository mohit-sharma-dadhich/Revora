const crypto = require('crypto');

const Order = require('../../models/Order');
const Customer = require('../../models/Customer');
const Product = require('../../models/Product');
const Experiment = require('../../models/Experiment');
const { createRazorpayService } = require('../razorpay/razorpayService');
const { ownershipFields, ownershipFilter } = require('../../utils/ownership');

function isObjectIdLike(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function pushAuditStep(orderId, { stepType, status, reason = null, metadata = {}, webhookEventId = null }) {
  await Order.findByIdAndUpdate(orderId, {
    $push: {
      auditSteps: { stepType, status, reason, metadata, webhookEventId, timestamp: new Date() },
    },
  });
}

async function validateExperimentCustomerAndProduct({ experimentId, customerId, auth }) {
  if (!isObjectIdLike(experimentId)) {
    throw new Error('Experiment identifier is required.');
  }

  if (!isObjectIdLike(customerId)) {
    throw new Error('Customer identifier is required.');
  }

  const experiment = await Experiment.findOne({ _id: experimentId, ...ownershipFilter(auth) }).lean();

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
  const baseProductId = (experiment.baseProductId || experiment.results?.baseProductId)?.toString() || null;
  const targetProductId = experiment.targetProductId ? experiment.targetProductId.toString() : null;

  if (!baseProductId) {
    throw new Error('Experiment base product is missing.');
  }

  if (!targetProductId) {
    throw new Error('Experiment target product is missing.');
  }

  const [baseProduct, targetProduct] = await Promise.all([
    Product.findById(baseProductId).lean(),
    Product.findById(targetProductId).lean(),
  ]);

  if (!baseProduct) {
    throw new Error('Experiment base product could not be found.');
  }

  if (!targetProduct) {
    throw new Error('Experiment target product could not be found.');
  }

  return {
    experiment,
    customer,
    experimentGroup,
    baseProductId,
    targetProductId,
    baseProduct,
    targetProduct,
  };
}

async function createExperimentOrder({ experimentId, customerId, auth }) {
  const { experiment, customer, experimentGroup, baseProductId, targetProductId, baseProduct, targetProduct } = await validateExperimentCustomerAndProduct({
    experimentId,
    customerId,
    auth,
  });

  const existingOrder = await Order.findOne({
    ...ownershipFilter(auth),
    experimentId,
    customerId,
    source: 'experiment',
    status: { $in: ['pending', 'paid'] },
  }).sort({ createdAt: -1 }).lean();

  if (existingOrder) {
    throw new Error('An experiment payment order already exists for this customer and experiment.');
  }

  const productIds = experimentGroup === 'control'
    ? [baseProductId]
    : [baseProductId, targetProductId];
  const amount = experimentGroup === 'control'
    ? baseProduct.price
    : baseProduct.price + targetProduct.price;

  const orderDocument = await Order.create({
    ...(auth ? { ...ownershipFields(auth), expiresAt: auth.mode === 'test' ? auth.expiresAt : null } : {}),
    customerId,
    productIds,
    amount,
    source: 'experiment',
    status: 'pending',
    experimentId,
    experimentGroup,
  });

  const razorpayService = createRazorpayService();
  const receipt = `revora_exp_${orderDocument._id.toString()}`;

  const razorpayOrder = await razorpayService.createTestOrder({
    amount,
    currency: 'INR',
    receipt,
    notes: {
      experimentId: experiment._id.toString(),
      customerId: customer._id.toString(),
      experimentGroup,
      baseProductId,
      targetProductId,
    },
  });

  orderDocument.razorpayOrderId = razorpayOrder.id;
  await orderDocument.save();

  await pushAuditStep(orderDocument._id, {
    stepType: 'order_created',
    status: 'SUCCESS',
    reason: 'Experiment order created and Razorpay order issued.',
    metadata: {
      experimentId,
      customerId,
      experimentGroup,
      baseProductId,
      targetProductId,
      orderId: orderDocument._id.toString(),
      razorpayOrderId: razorpayOrder.id,
      amount,
    },
  });

  return {
    orderId: razorpayOrder.id,
    amount,
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

function verifyWebhookSignature({ rawBody, signatureHeader }) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret || !webhookSecret.trim()) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is missing.');
  }

  if (!signatureHeader || !signatureHeader.trim()) {
    throw new Error('Invalid webhook signature.');
  }

  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(String(rawBody || ''), 'utf8');

  const digest = crypto
    .createHmac('sha256', webhookSecret.trim())
    .update(bodyBuffer)
    .digest('hex');

  if (digest !== signatureHeader.trim()) {
    throw new Error('Invalid webhook signature.');
  }
}

async function hasProcessedWebhookEvent(eventId, order) {
  if (!eventId || !order) return false;
  return (order.auditSteps || []).some((step) => step.webhookEventId === eventId);
}

function getPaymentEntity(payload) {
  return payload && payload.payload && payload.payload.payment && payload.payload.payment.entity;
}

async function handlePaymentCapturedWebhook(payload, eventId) {
  if (!payload || payload.event !== 'payment.captured') {
    throw new Error('Unsupported webhook event.');
  }

  const paymentEntity = getPaymentEntity(payload);

  if (!paymentEntity) {
    throw new Error('Payment event payload is invalid.');
  }

  const razorpayOrderId = paymentEntity.order_id;
  const razorpayPaymentId = paymentEntity.id;

  if (!razorpayOrderId || !razorpayPaymentId) {
    throw new Error('Payment order metadata is missing.');
  }

  const order = await Order.findOne({ razorpayOrderId }).lean();

  if (!order) {
    throw new Error('Payment order not found.');
  }

  if (await hasProcessedWebhookEvent(eventId, order)) return { success: true, duplicate: true };

  if (order.status === 'paid' && order.razorpayPaymentId === razorpayPaymentId) {
    await pushAuditStep(order._id, {
      stepType: 'webhook_captured',
      status: 'SUCCESS',
      reason: 'Razorpay payment.captured webhook verified; order was already paid.',
      metadata: { razorpayOrderId, razorpayPaymentId },
      webhookEventId: eventId,
    });
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

  if (persistedOrder.status === 'paid' && persistedOrder.razorpayPaymentId === razorpayPaymentId) {
    await pushAuditStep(persistedOrder._id, {
      stepType: 'webhook_captured',
      status: 'SUCCESS',
      reason: 'Razorpay payment.captured webhook verified; order was already paid.',
      metadata: { razorpayOrderId, razorpayPaymentId },
      webhookEventId: eventId,
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

  persistedOrder.razorpayPaymentId = razorpayPaymentId;
  persistedOrder.status = 'paid';
  await persistedOrder.save();

  await pushAuditStep(persistedOrder._id, {
    stepType: 'webhook_captured',
    status: 'SUCCESS',
    reason: 'Razorpay payment.captured webhook verified and order marked paid.',
    metadata: {
      razorpayOrderId,
      razorpayPaymentId,
      experimentId: persistedOrder.experimentId ? persistedOrder.experimentId.toString() : null,
      customerId: persistedOrder.customerId ? persistedOrder.customerId.toString() : null,
      experimentGroup: persistedOrder.experimentGroup || null,
      orderId: persistedOrder._id.toString(),
    },
    webhookEventId: eventId,
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

async function handlePaymentFailedWebhook(payload, eventId) {
  if (!payload || payload.event !== 'payment.failed') {
    throw new Error('Unsupported webhook event.');
  }

  const paymentEntity = getPaymentEntity(payload);
  if (!paymentEntity || !paymentEntity.order_id || !paymentEntity.id) {
    throw new Error('Payment order metadata is missing.');
  }

  const order = await Order.findOne({ razorpayOrderId: paymentEntity.order_id });
  if (!order) throw new Error('Payment order not found.');

  if (await hasProcessedWebhookEvent(eventId, order)) return { success: true, duplicate: true };

  if (order.status !== 'paid') {
    order.status = 'failed';
    order.razorpayPaymentId = paymentEntity.id;
    order.razorpayFailureCode = paymentEntity.error_code || null;
    order.razorpayFailureDescription = paymentEntity.error_description || null;
    order.razorpayPaymentMethod = paymentEntity.method || null;
    order.razorpayPaymentCreatedAt = paymentEntity.created_at ? new Date(paymentEntity.created_at * 1000) : null;
    await order.save();
  }

  await pushAuditStep(order._id, {
    stepType: 'webhook_failed',
    status: 'FAILED',
    reason: 'Razorpay payment.failed webhook verified and order marked failed.',
    metadata: {
      razorpayOrderId: paymentEntity.order_id,
      razorpayPaymentId: paymentEntity.id,
      experimentId: order.experimentId ? order.experimentId.toString() : null,
      customerId: order.customerId ? order.customerId.toString() : null,
      experimentGroup: order.experimentGroup || null,
      errorCode: paymentEntity.error_code || null,
      errorDescription: paymentEntity.error_description || null,
    },
    webhookEventId: eventId,
  });

  return { success: true, data: { orderId: order.razorpayOrderId, paymentId: order.razorpayPaymentId, status: order.status, experimentId: order.experimentId ? order.experimentId.toString() : null, customerId: order.customerId ? order.customerId.toString() : null, group: order.experimentGroup || null } };
}

async function verifyExperimentPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, auth }) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new Error('Razorpay order ID, payment ID, and signature are required.');
  }

  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, ...ownershipFilter(auth) }).lean();

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
    await pushAuditStep(order._id, {
      stepType: 'client_verification_failed',
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

  await pushAuditStep(persistedOrder._id, {
    stepType: 'client_verified',
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
  handlePaymentCapturedWebhook,
  handlePaymentFailedWebhook,
  validateExperimentCustomerAndProduct,
  verifyExperimentPayment,
  verifyWebhookSignature,
};
