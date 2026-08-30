const AuditLog = require('../../models/AuditLog');
const { auditOwnershipFilter } = require('../../utils/ownership');

async function listAuditLogs({ auth, limit = 50, skip = 0, action, status } = {}) {
  const maxLimit = 200;
  const clampedLimit = Math.min(Math.max(1, Number.isInteger(limit) ? limit : 50), maxLimit);
  const clampedSkip = Math.max(0, Number.isInteger(skip) ? skip : 0);

  const filter = {
    ...auditOwnershipFilter(auth),
    ...(action ? { action } : {}),
    ...(status ? { status } : {}),
  };

  const [entries, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(clampedSkip)
      .limit(clampedLimit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    entries: entries.map((doc) => ({
      id: doc._id.toString(),
      timestamp: doc.timestamp.toISOString(),
      actor: doc.actor,
      action: doc.action,
      status: doc.status,
      reason: doc.reason,
      metadata: doc.metadata || {},
    })),
    total,
    limit: clampedLimit,
    skip: clampedSkip,
  };
}

module.exports = {
  listAuditLogs,
};
