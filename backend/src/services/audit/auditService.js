const AuditLog = require('../../models/AuditLog');

function ownershipFilter(auth) {
  if (!auth) return {};
  return auth.mode === 'test' ? { sessionId: auth.sessionId } : { ownerId: auth.user.id };
}

async function listAuditLogs({ auth, limit = 50, skip = 0, action, status } = {}) {
  const maxLimit = 200;
  const clampedLimit = Math.min(Math.max(1, Number.isInteger(limit) ? limit : 50), maxLimit);
  const clampedSkip = Math.max(0, Number.isInteger(skip) ? skip : 0);

  const filter = {
    ...ownershipFilter(auth),
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
