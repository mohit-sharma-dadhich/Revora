const test = require('node:test');
const assert = require('node:assert/strict');

const { auditOwnershipFilter, ownershipFilter } = require('./ownership');

test('test-mode ownership filter includes current session and unscoped records', () => {
  const filter = ownershipFilter({ mode: 'test', sessionId: 'session-123' });

  assert.deepEqual(filter, {
    $or: [
      { sessionId: 'session-123' },
      { sessionId: null },
      { sessionId: { $exists: false } },
    ],
  });
});

test('live-mode ownership filter includes current user and unscoped records', () => {
  const filter = ownershipFilter({ mode: 'live', user: { id: 'user-42' } });

  assert.deepEqual(filter, {
    $or: [
      { ownerId: 'user-42' },
      { ownerId: null },
      { ownerId: { $exists: false } },
    ],
  });
});

test('audit log access is restricted to the current session or user only', () => {
  assert.deepEqual(auditOwnershipFilter({ mode: 'test', sessionId: 'session-123' }), {
    sessionId: 'session-123',
  });

  assert.deepEqual(auditOwnershipFilter({ mode: 'live', user: { id: 'user-42' } }), {
    ownerId: 'user-42',
  });

  assert.deepEqual(auditOwnershipFilter(null), { _id: { $exists: false } });
});
