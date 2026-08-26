const express = require('express');
const { handleRazorpayWebhook } = require('../controllers/webhookController');

const router = express.Router();

router.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

module.exports = router;
