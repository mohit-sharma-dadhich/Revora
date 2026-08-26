const crypto = require('crypto');

const {
  handlePaymentCapturedWebhook,
  verifyWebhookSignature,
} = require('../services/payments/paymentService');

async function handleRazorpayWebhook(req, res) {
  try {
    // This route must be registered with express.raw({ type: 'application/json' })
    // before the global express.json() parser in app.js so the raw request bytes
    // remain available for HMAC verification with the Razorpay webhook secret.
    const rawBody = req.body;
    const signatureHeader = req.get('x-razorpay-signature');

    verifyWebhookSignature({
      rawBody,
      signatureHeader,
    });

    const payload = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || ''));
    await handlePaymentCapturedWebhook(payload);

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    if (error.message === 'Invalid webhook signature.') {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook signature.',
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Webhook processing failed.',
    });
  }
}

module.exports = {
  handleRazorpayWebhook,
};
