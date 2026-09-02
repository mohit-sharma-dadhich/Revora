const { listAuditLogs } = require('../services/audit/auditService');
const { listPaymentAudits } = require('../services/payments/paymentAuditService');

async function getAuditLog(req, res) {
  try {
    const limit = Number.isInteger(Number(req.query.limit)) ? Number(req.query.limit) : 50;
    const skip = Number.isInteger(Number(req.query.skip)) ? Number(req.query.skip) : 0;
    const action = req.query.action || null;
    const status = req.query.status || null;

    const result = await listAuditLogs({
      auth: req.auth,
      limit,
      skip,
      action,
      status,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

async function getPaymentAudits(req, res) {
  try {
    const limit = Number.isInteger(Number(req.query.limit)) ? Number(req.query.limit) : 50;
    const skip = Number.isInteger(Number(req.query.skip)) ? Number(req.query.skip) : 0;

    const result = await listPaymentAudits({
      auth: req.auth,
      limit,
      skip,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  getAuditLog,
  getPaymentAudits,
};
