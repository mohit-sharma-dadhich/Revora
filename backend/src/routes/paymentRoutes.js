const express = require('express');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

const router = express.Router();

router.post('/payments/create-order', createOrder);
router.post('/payments/verify', verifyPayment);

module.exports = router;
