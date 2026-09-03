const test = require('node:test');
const assert = require('node:assert/strict');

const Experiment = require('../../models/Experiment');
const Order = require('../../models/Order');
const AuditLog = require('../../models/AuditLog');
const { analyzeExperiment, endExperiment, startExperiment } = require('./experimentLifecycleService');

const experimentId = 'experiment-1';
const controlCustomerIds = ['control-1', 'control-2', 'control-3', 'control-4'];
const treatmentCustomerIds = ['treatment-1', 'treatment-2', 'treatment-3', 'treatment-4'];
const startAt = new Date('2026-01-01T00:00:00.000Z');

const originalMethods = {
  experimentFindOne: Experiment.findOne,
  experimentFindById: Experiment.findById,
  orderCountDocuments: Order.countDocuments,
  orderExists: Order.exists,
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

function addPaidExperimentOrder(customerId, experimentGroup, createdAt = new Date(startAt.getTime() + 1000)) {
  paidExperimentOrders.push({
    experimentId,
    experimentGroup,
    source: 'experiment',
    status: 'paid',
    customerId,
    amount: 1000,
    createdAt: new Date(createdAt),
  });
}

function seedInitialEvidence() {
  completedOrders = [];
  paidExperimentOrders = [];
  auditEvents = [];

  controlCustomerIds.slice(0, 3).forEach((customerId, index) => {
    addCompletedOrder(customerId, new Date(startAt.getTime() + (index + 1) * 1000));
    addPaidExperimentOrder(customerId, 'control', new Date(startAt.getTime() + (index + 1) * 1000));
  });
  treatmentCustomerIds.slice(0, 4).forEach((customerId, index) => {
    addCompletedOrder(customerId, new Date(startAt.getTime() + (index + 4) * 1000));
    addPaidExperimentOrder(customerId, 'treatment', new Date(startAt.getTime() + (index + 4) * 1000));
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
  Order.countDocuments = async (query) => {
    const matching = completedOrders.filter((order) => (
      matchesCustomer(query, order.customerId)
      && order.status === query.status
      && order.createdAt > query.createdAt.$gt
    ));

    const paidMatching = paidExperimentOrders.filter((order) => (
      String(order.experimentId) === String(query.experimentId)
      && order.experimentGroup === query.experimentGroup
      && order.source === query.source
      && order.status === query.status
      && order.customerId && query.customerId && query.customerId.$in.some((customerId) => String(customerId) === String(order.customerId))
      && order.createdAt > query.createdAt.$gt
    ));

    return matching.length + paidMatching.length;
  };
  Order.exists = async (query) => paidExperimentOrders.some((order) => (
    String(order.experimentId) === String(query.experimentId)
    && order.experimentGroup === query.experimentGroup
    && order.source === query.source
    && order.status === query.status
    && order.customerId && query.customerId && query.customerId.$in.some((customerId) => String(customerId) === String(order.customerId))
  ));
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
  Order.exists = originalMethods.orderExists;
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

test('startExperiment rejects a running experiment through the invalid transition path', async () => {
  await assert.rejects(
    startExperiment(experimentId, null),
    /Invalid experiment state transition from running to running\./,
  );

  assert.equal(auditEvents.at(-1).action, 'EXPERIMENT_START_REJECTED');
  assert.equal(auditEvents.at(-1).status, 'BLOCKED');
});

test('endExperiment completes after logging a failed best-effort analysis', async () => {
  Experiment.findById = () => ({
    lean: async () => null,
  });

  const result = await endExperiment(experimentId, null);

  assert.equal(result.status, 'completed');
  assert.ok(experiment.endAt instanceof Date);
  assert.equal(auditEvents.at(-2).action, 'EXPERIMENT_END_STALE_DECISION');
  assert.equal(auditEvents.at(-2).status, 'FAILED');
  assert.equal(auditEvents.at(-1).action, 'EXPERIMENT_ENDED');
});

test('first analysis measures all paid experiment evidence and sets lastAnalyzedAt', async () => {
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

test('paid experiment orders count as new evidence even without historical completed orders', async () => {
  completedOrders = [];
  paidExperimentOrders = [];
  addPaidExperimentOrder('control-1', 'control');
  addPaidExperimentOrder('treatment-1', 'treatment');
  experiment.lastAnalyzedAt = new Date('2026-01-01T00:00:00.000Z');
  experiment.results = { existing: true };

  const result = await analyzeExperiment(experimentId, null);

  assert.equal(result.measurement.control.convertedCustomerCount, 1);
  assert.equal(result.measurement.treatment.convertedCustomerCount, 1);
  assert.equal(auditEvents.at(-1).action, 'EXPERIMENT_ANALYZED');
});

test('paid orders from another experiment do not satisfy the analysis gate', async () => {
  completedOrders = [];
  paidExperimentOrders = [{
    experimentId: 'another-experiment',
    experimentGroup: 'control',
    source: 'experiment',
    status: 'paid',
    customerId: 'control-1',
    amount: 1000,
    createdAt: new Date(startAt.getTime() + 1000),
  }];
  experiment.lastAnalyzedAt = new Date(startAt);

  await assert.rejects(
    analyzeExperiment(experimentId, null),
    /control: 0 new, treatment: 0 new/,
  );
});

test('one new control order is enough and measurement uses the new cumulative total', async () => {
  await analyzeExperiment(experimentId, null);
  const newCreatedAt = new Date(experiment.lastAnalyzedAt.getTime() + 1000);
  addCompletedOrder('control-4', newCreatedAt);
  addPaidExperimentOrder('control-4', 'control', newCreatedAt);

  const result = await analyzeExperiment(experimentId, null);

  assert.equal(result.measurement.control.convertedCustomerCount, 4);
  assert.equal(result.measurement.treatment.convertedCustomerCount, 4);
});

test('analysis is rate limited again after the successful control-only analysis', async () => {
  await analyzeExperiment(experimentId, null);
  addCompletedOrder('control-4', new Date(experiment.lastAnalyzedAt.getTime() + 1000));
  addPaidExperimentOrder('control-4', 'control', new Date(experiment.lastAnalyzedAt.getTime() + 1000));
  await analyzeExperiment(experimentId, null);
  paidExperimentOrders.at(-1).createdAt = new Date(experiment.lastAnalyzedAt);

  await assert.rejects(
    analyzeExperiment(experimentId, null),
    /control: 0 new, treatment: 0 new/,
  );
});

test('one new treatment order is enough for the next analysis', async () => {
  await analyzeExperiment(experimentId, null);
  const controlCreatedAt = new Date(experiment.lastAnalyzedAt.getTime() + 1000);
  addCompletedOrder('control-4', controlCreatedAt);
  addPaidExperimentOrder('control-4', 'control', controlCreatedAt);
  await analyzeExperiment(experimentId, null);

  const treatmentCreatedAt = new Date(experiment.lastAnalyzedAt.getTime() + 1000);
  addCompletedOrder('treatment-4', treatmentCreatedAt);
  addPaidExperimentOrder('treatment-4', 'treatment', treatmentCreatedAt);
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
