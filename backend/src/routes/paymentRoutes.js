const express = require('express');
const { createOrder, verifyPayment, testCreateOrder } = require('../controllers/paymentController');

const router = express.Router();

router.post('/payments/create-order', createOrder);
router.post('/payments/verify', verifyPayment);
router.post('/payments/test-order', testCreateOrder);

module.exports = router;
