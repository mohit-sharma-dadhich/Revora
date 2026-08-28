const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assignAudienceDeterministically,
  selectAudienceDeterministically,
} = require('./experimentProposalService');

test('seeded audience selection is reproducible for a fixed seed', () => {
  const eligibleCustomers = ['customer-1', 'customer-2', 'customer-3', 'customer-4', 'customer-5', 'customer-6'];

  const first = selectAudienceDeterministically(eligibleCustomers, 3, 12345);
  const second = selectAudienceDeterministically(eligibleCustomers, 3, 12345);

  assert.deepEqual(first, second);
  assert.deepEqual(eligibleCustomers, [
    'customer-1',
    'customer-2',
    'customer-3',
    'customer-4',
    'customer-5',
    'customer-6',
  ]);
});

test('different seeds select different subsets from the eligible pool', () => {
  const eligibleCustomers = ['customer-1', 'customer-2', 'customer-3', 'customer-4', 'customer-5', 'customer-6'];

  const first = selectAudienceDeterministically(eligibleCustomers, 3, 1);
  const second = selectAudienceDeterministically(eligibleCustomers, 3, 2);

  assert.notDeepEqual(first, second);
  assert.notDeepEqual(first, eligibleCustomers.slice(0, 3));
  assert.notDeepEqual(second, eligibleCustomers.slice(0, 3));
});

test('seeded assignment is reproducible and preserves the input', () => {
  const customers = ['customer-1', 'customer-2', 'customer-3', 'customer-4', 'customer-5', 'customer-6'];
  const originalCustomers = [...customers];

  const first = assignAudienceDeterministically(customers, 0.5, 12345);
  const second = assignAudienceDeterministically(customers, 0.5, 12345);

  assert.deepEqual(first, second);
  assert.deepEqual(customers, originalCustomers);
});

test('different seeds produce independent valid assignments', () => {
  const customers = ['customer-1', 'customer-2', 'customer-3', 'customer-4', 'customer-5', 'customer-6'];

  const first = assignAudienceDeterministically(customers, 0.5, 1);
  const second = assignAudienceDeterministically(customers, 0.5, 2);

  for (const assignment of [first, second]) {
    const assignedCustomers = [...assignment.controlCustomerIds, ...assignment.treatmentCustomerIds];
    assert.equal(assignment.controlCustomerIds.length, 3);
    assert.equal(assignment.treatmentCustomerIds.length, 3);
    assert.equal(new Set(assignedCustomers).size, customers.length);
    assert.deepEqual(new Set(assignedCustomers), new Set(customers));
  }
});

test('seeded assignment has disjoint complete groups with expected sizes', () => {
  const customers = ['customer-1', 'customer-2', 'customer-3', 'customer-4', 'customer-5', 'customer-6', 'customer-7', 'customer-8'];
  const assignment = assignAudienceDeterministically(customers, 0.5, 42);
  const assignedCustomers = [...assignment.controlCustomerIds, ...assignment.treatmentCustomerIds];

  assert.equal(assignment.controlCustomerIds.length, 4);
  assert.equal(assignment.treatmentCustomerIds.length, 4);
  assert.equal(new Set(assignedCustomers).size, customers.length);
  assert.deepEqual(new Set(assignedCustomers), new Set(customers));
  assert.equal(
    new Set(assignment.controlCustomerIds).size + new Set(assignment.treatmentCustomerIds).size,
    assignedCustomers.length,
  );
});
