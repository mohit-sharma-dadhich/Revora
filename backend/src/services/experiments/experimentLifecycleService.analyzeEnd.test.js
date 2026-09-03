const test = require('node:test');
const assert = require('node:assert/strict');

const Experiment = require('../../models/Experiment');
const Order = require('../../models/Order');
const AuditLog = require('../../models/AuditLog');
const { analyzeExperiment } = require('./experimentLifecycleService');

const experimentId = 'experiment-1';
const controlCustomerIds = ['control-1', 'control-2', 'control-3', 'control-4'];
const treatmentCustomerIds = ['treatment-1', 'treatment-2', 'treatment-3', 'treatment-4'];
const startAt = new Date('2026-01-01T00:00:00.000Z');

const originalMethods = {
  experimentFindOne: Experiment.findOne,
  experimentFindById: Experiment.findById,
  orderCountDocuments: Order.countDocuments,
  orderFind: Order.find,
  auditCreate: AuditLog.create,
};

let experiment;
let completedOrders;
let paidExperimentOrders;
let auditEvents;

function cloneDate(value) {
  return value ? new Date(value.getTime()) : value;
}

function createExperiment(status = 'running') {
  return {
    _id: experimentId,
    strategy: 'CROSS_SELL',
    targetProductId: 'target-product-1',
    status,
    controlCustomerIds: controlCustomerIds.slice(0, 4),
    treatmentCustomerIds: treatmentCustomerIds.slice(0, 4),
    startAt: cloneDate(startAt),
    endAt: null,
    results: { existing: true },
    decision: 'PENDING',
    lastAnalyzedAt: null,
    save: async function save() {
      return this;
    },
    toObject() {
      return {
        ...this,
        startAt: cloneDate(this.startAt),
        endAt: cloneDate(this.endAt),
        lastAnalyzedAt: cloneDate(this.lastAnalyzedAt),
        save: undefined,
        toObject: undefined,
      };
    },
  };
}

function addCompletedOrder(customerId, createdAt) {
  completedOrders.push({
    customerId,
    status: 'completed',
    createdAt: new Date(createdAt),
  });
}

function addPaidExperimentOrder(customerId, experimentGroup) {
  paidExperimentOrders.push({
    experimentId,
    experimentGroup,
    source: 'experiment',
    status: 'paid',
    customerId,
    amount: 1000,
  });
}

function seedInitialEvidence() {
  completedOrders = [];
  paidExperimentOrders = [];
  auditEvents = [];

  controlCustomerIds.slice(0, 3).forEach((customerId, index) => {
    addCompletedOrder(customerId, new Date(startAt.getTime() + (index + 1) * 1000));
    addPaidExperimentOrder(customerId, 'control');
  });
  treatmentCustomerIds.slice(0, 4).forEach((customerId, index) => {
    addCompletedOrder(customerId, new Date(startAt.getTime() + (index + 4) * 1000));
    addPaidExperimentOrder(customerId, 'treatment');
  });
}

function matchesCustomer(query, customerId) {
  return query.customerId && query.customerId.$in.some((id) => id.toString() === customerId.toString());
}

function installModelStubs() {
  Experiment.findOne = async () => experiment;
  Experiment.findById = () => ({
    lean: async () => experiment,
  });
  Order.countDocuments = async (query) => completedOrders.filter((order) => (
    matchesCustomer(query, order.customerId)
    && order.status === query.status
    && order.createdAt > query.createdAt.$gt
  )).length;
  Order.find = (query) => ({
    lean: async () => paidExperimentOrders.filter((order) => (
      order.experimentId === query.experimentId
      && order.experimentGroup === query.experimentGroup
      && order.source === query.source
    )),
  });
  AuditLog.create = async (event) => {
    auditEvents.push(event);
    return event;
  };
}

function restoreModelMethods() {
  Experiment.findOne = originalMethods.experimentFindOne;
  Experiment.findById = originalMethods.experimentFindById;
  Order.countDocuments = originalMethods.orderCountDocuments;
  Order.find = originalMethods.orderFind;
  AuditLog.create = originalMethods.auditCreate;
}

test.beforeEach(() => {
  experiment = createExperiment();
  seedInitialEvidence();
  installModelStubs();
});

test.afterEach(() => {
  restoreModelMethods();
});

test('analyzeExperiment rejects a draft experiment', async () => {
  experiment.status = 'draft';

  await assert.rejects(
    analyzeExperiment(experimentId, null),
    /Cannot analyze an experiment with status draft\./,
  );
});

test('first analysis measures all completed control and treatment evidence and sets lastAnalyzedAt', async () => {
  const result = await analyzeExperiment(experimentId, null);

  assert.equal(result.measurement.control.convertedCustomerCount, 3);
  assert.equal(result.measurement.treatment.convertedCustomerCount, 4);
  assert.ok(experiment.lastAnalyzedAt instanceof Date);
  assert.equal(auditEvents.at(-1).action, 'EXPERIMENT_ANALYZED');
});

test('analysis is rate limited when neither group has new orders and preserves state', async () => {
  await analyzeExperiment(experimentId, null);
  const previousLastAnalyzedAt = experiment.lastAnalyzedAt;
  const previousResults = structuredClone(experiment.results);

  await assert.rejects(
    analyzeExperiment(experimentId, null),
    /control: 0 new, treatment: 0 new/,
  );

  assert.equal(experiment.lastAnalyzedAt.getTime(), previousLastAnalyzedAt.getTime());
  assert.deepEqual(experiment.results, previousResults);
});

test('one new control order is enough and measurement uses the new cumulative total', async () => {
  await analyzeExperiment(experimentId, null);
  const newCreatedAt = new Date(experiment.lastAnalyzedAt.getTime() + 1000);
  addCompletedOrder('control-4', newCreatedAt);
  addPaidExperimentOrder('control-4', 'control');

  const result = await analyzeExperiment(experimentId, null);

  assert.equal(result.measurement.control.convertedCustomerCount, 4);
  assert.equal(result.measurement.treatment.convertedCustomerCount, 4);
});

test('analysis is rate limited again after the successful control-only analysis', async () => {
  await analyzeExperiment(experimentId, null);
  addCompletedOrder('control-4', new Date(experiment.lastAnalyzedAt.getTime() + 1000));
  addPaidExperimentOrder('control-4', 'control');
  await analyzeExperiment(experimentId, null);
  completedOrders.at(-1).createdAt = new Date(experiment.lastAnalyzedAt);

  await assert.rejects(
    analyzeExperiment(experimentId, null),
    /control: 0 new, treatment: 0 new/,
  );
});

test('one new treatment order is enough for the next analysis', async () => {
  await analyzeExperiment(experimentId, null);
  addCompletedOrder('control-4', new Date(experiment.lastAnalyzedAt.getTime() + 1000));
  addPaidExperimentOrder('control-4', 'control');
  await analyzeExperiment(experimentId, null);

  addCompletedOrder('treatment-4', new Date(experiment.lastAnalyzedAt.getTime() + 1000));
  const result = await analyzeExperiment(experimentId, null);

  assert.equal(result.measurement.control.convertedCustomerCount, 4);
  assert.equal(result.measurement.treatment.convertedCustomerCount, 4);
});

test('a blocked analysis never changes lastAnalyzedAt', async () => {
  await analyzeExperiment(experimentId, null);
  const before = experiment.lastAnalyzedAt.getTime();
  const resultsBefore = structuredClone(experiment.results);

  await assert.rejects(
    analyzeExperiment(experimentId, null),
    /control: 0 new, treatment: 0 new/,
  );

  assert.equal(experiment.lastAnalyzedAt.getTime(), before);
  assert.deepEqual(experiment.results, resultsBefore);
});
