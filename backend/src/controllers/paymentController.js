const { createExperimentOrder, verifyExperimentPayment } = require('../services/payments/paymentService');

async function createOrder(req, res) {
  try {
    const { experimentId, customerId } = req.body || {};

    const result = await createExperimentOrder({
      experimentId,
      customerId,
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
    });

    return res.status(200).json(result);
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
};
