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

function scopedReadFilter(auth) {
  const baseline = { ownerId: null, sessionId: null };
  if (!auth) return baseline;
  return { $or: [baseline, ownershipFilter(auth)] };
}

module.exports = {
  ownershipFilter,
  scopedReadFilter,
};
