function ownershipFilter(auth) {
  if (!auth) return {};

  if (auth.mode === 'test') {
    return {
      $or: [
        { sessionId: auth.sessionId },
        { sessionId: null },
        { sessionId: { $exists: false } },
      ],
    };
  }

  return {
    $or: [
      { ownerId: auth.user.id },
      { ownerId: null },
      { ownerId: { $exists: false } },
    ],
  };
}

function auditOwnershipFilter(auth) {
  if (!auth) return { _id: { $exists: false } };

  if (auth.mode === 'test') {
    return { sessionId: auth.sessionId };
  }

  return { ownerId: auth.user.id };
}

function ownershipFields(auth) {
  if (!auth) return {};

  if (auth.mode === 'test') {
    return {
      sessionId: auth.sessionId,
      expiresAt: auth.expiresAt,
    };
  }

  return {
    ownerId: auth.user.id,
  };
}

function scopedReadFilter(auth) {
  const baseline = { ownerId: null, sessionId: null };
  if (!auth) return baseline;
  return { $or: [baseline, ownershipFilter(auth)] };
}

module.exports = {
  auditOwnershipFilter,
  ownershipFilter,
  ownershipFields,
  scopedReadFilter,
};
