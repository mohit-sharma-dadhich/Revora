const Order = require('../models/Order');
const { createExperimentOrder, validateExperimentCustomerAndProduct, verifyExperimentPayment } = require('../services/payments/paymentService');
const { ownershipFilter } = require('../utils/ownership');

async function createOrder(req, res) {
  try {
    const { experimentId, customerId } = req.body || {};

    const result = await createExperimentOrder({
      experimentId,
      customerId,
      auth: req.auth,
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: result.orderId,
        amount: result.amount,
        currency: result.currency,
        keyId: result.keyId,
        experimentId: result.experimentId,
        group: result.group,
      },
    });
  } catch (error) {
    const status = error.message === 'Experiment not found.' || error.message === 'Customer not found.' ? 404 : 400;

    return res.status(status).json({
      success: false,
      error: error.message,
    });
  }
}

async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    const result = await verifyExperimentPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      auth: req.auth,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

async function testCreateOrder(req, res) {
  try {
    const { customerId, experimentId } = req.body || {};

    if (req.auth?.mode !== 'test') {
      throw new Error('Test orders require a test session.');
    }

    const { experiment, experimentGroup, baseProductId, targetProductId, baseProduct, targetProduct } = await validateExperimentCustomerAndProduct({
      experimentId,
      customerId,
      auth: req.auth,
    });
    const normalizedProductIds = experimentGroup === 'control'
      ? [baseProductId]
      : [baseProductId, targetProductId];
    const amount = experimentGroup === 'control'
      ? baseProduct.price
      : baseProduct.price + targetProduct.price;

    const order = new Order({
      customerId,
      productIds: normalizedProductIds,
      experimentId,
      experimentGroup,
      source: 'experiment',
      status: 'paid',
      amount,
      ...(req.auth ? { ...ownershipFilter(req.auth), expiresAt: req.auth.mode === 'test' ? req.auth.expiresAt : null } : {}),
    });

    await order.save();

    return res.status(201).json({
      success: true,
      data: {
        orderId: order._id.toString(),
        customerId: order.customerId.toString(),
        productIds: order.productIds.map((id) => id.toString()),
        experimentId: order.experimentId.toString(),
        experimentGroup: order.experimentGroup,
        status: order.status,
        amount: order.amount,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  testCreateOrder,
};
