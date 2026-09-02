const express = require('express');
const { getAuditLog, getPaymentAudits } = require('../controllers/auditController');

const router = express.Router();

router.get('/audit', getAuditLog);
router.get('/audit/payments', getPaymentAudits);

module.exports = router;
