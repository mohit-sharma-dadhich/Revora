const test = require('node:test');
const assert = require('node:assert/strict');

const { auditOwnershipFilter, ownershipFilter, ownershipFields, resolveOwnershipScope } = require('./ownership');

test('test-mode ownership filter is scoped to the current session only', () => {
  const filter = ownershipFilter({ mode: 'test', sessionId: 'session-123' });

  assert.deepEqual(filter, {
    sessionId: 'session-123',
  });
});

test('live-mode ownership filter is scoped to the current user only', () => {
  const filter = ownershipFilter({ mode: 'live', user: { id: 'user-42' } });

  assert.deepEqual(filter, {
    ownerId: 'user-42',
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

test('ownership scope resolves from auth or a persisted record, never leaves audit rows unscoped', () => {
  assert.deepEqual(resolveOwnershipScope({ mode: 'test', sessionId: 'session-123', expiresAt: '2026-01-01T00:00:00.000Z' }), {
    sessionId: 'session-123',
    expiresAt: '2026-01-01T00:00:00.000Z',
  });

  assert.deepEqual(resolveOwnershipScope({ mode: 'live', user: { id: 'user-42' } }), {
    ownerId: 'user-42',
  });

  assert.deepEqual(resolveOwnershipScope({ ownerId: 'owner-99', sessionId: 'session-77', expiresAt: '2026-01-02T00:00:00.000Z' }), {
    ownerId: 'owner-99',
    sessionId: 'session-77',
    expiresAt: '2026-01-02T00:00:00.000Z',
  });

  assert.deepEqual(ownershipFields({ ownerId: 'owner-99', sessionId: 'session-77', expiresAt: '2026-01-02T00:00:00.000Z' }), {
    ownerId: 'owner-99',
    sessionId: 'session-77',
    expiresAt: '2026-01-02T00:00:00.000Z',
  });
});
