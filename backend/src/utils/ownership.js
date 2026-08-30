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

  if (auth.mode === 'live') {
    return auth.user && auth.user.id ? { ownerId: auth.user.id } : {};
  }

  if (auth.ownerId || auth.sessionId || auth.expiresAt) {
    return {
      ...(auth.ownerId ? { ownerId: auth.ownerId } : {}),
      ...(auth.sessionId ? { sessionId: auth.sessionId } : {}),
      ...(auth.expiresAt ? { expiresAt: auth.expiresAt } : {}),
    };
  }

  return {};
}

function resolveOwnershipScope(auth) {
  if (!auth) return {};

  if (auth.mode === 'test') {
    return {
      sessionId: auth.sessionId,
      expiresAt: auth.expiresAt,
    };
  }

  if (auth.mode === 'live') {
    return auth.user && auth.user.id ? { ownerId: auth.user.id } : {};
  }

  return {
    ...(auth.ownerId ? { ownerId: auth.ownerId } : {}),
    ...(auth.sessionId ? { sessionId: auth.sessionId } : {}),
    ...(auth.expiresAt ? { expiresAt: auth.expiresAt } : {}),
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
  resolveOwnershipScope,
  scopedReadFilter,
};
