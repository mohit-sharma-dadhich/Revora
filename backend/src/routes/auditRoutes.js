const express = require('express');
const { getAuditLog } = require('../controllers/auditController');

const router = express.Router();

router.get('/audit', getAuditLog);

module.exports = router;
