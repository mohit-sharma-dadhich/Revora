function ownershipFilter(auth) {
  if (!auth) return {};
  if (auth.mode === 'test') return { sessionId: auth.sessionId };
  return { ownerId: auth.user.id };
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
