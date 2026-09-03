const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Experiment = require('../../models/Experiment');
const Order = require('../../models/Order');
const AuditLog = require('../../models/AuditLog');
const { scaleExperiment } = require('./experimentLifecycleService');

const experimentId = new mongoose.Types.ObjectId();
const baseProductId = new mongoose.Types.ObjectId();
const eligibleCustomerIds = [
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
].map((id) => id.toString());

const originalMethods = {
  experimentFindOne: Experiment.findOne,
  orderAggregate: Order.aggregate,
  auditCreate: AuditLog.create,
};

let experiment;
let auditEvents;

function createExperiment({ status = 'running', decision = 'SCALE', assignmentSeed = 42 } = {}) {
  return {
    _id: experimentId,
    strategy: 'CROSS_SELL',
    baseProductId,
    targetProductId: new mongoose.Types.ObjectId(),
    status,
    decision,
    controlCustomerIds: [eligibleCustomerIds[0]],
    treatmentCustomerIds: [eligibleCustomerIds[1]],
    results: {
      proposedAudienceSize: 2,
      maxExposurePercent: 1,
      treatmentPercentage: 0.5,
      ...(assignmentSeed === undefined ? {} : { assignmentSeed }),
    },
    scaleEvents: [],
    lastScaledAt: null,
    save: async function save() {
      return this;
    },
    toObject() {
      return {
        ...this,
        save: undefined,
        toObject: undefined,
      };
    },
  };
}

function installModelStubs() {
  Experiment.findOne = async () => experiment;
  Order.aggregate = async () => eligibleCustomerIds.map((_id) => ({ _id }));
  AuditLog.create = async (event) => {
    auditEvents.push(event);
    return event;
  };
}

function restoreModelMethods() {
  Experiment.findOne = originalMethods.experimentFindOne;
  Order.aggregate = originalMethods.orderAggregate;
  AuditLog.create = originalMethods.auditCreate;
}

test.beforeEach(() => {
  experiment = createExperiment();
  auditEvents = [];
  installModelStubs();
});

test.afterEach(() => {
  restoreModelMethods();
});

test('scaling a non-running experiment throws', async () => {
  experiment.status = 'completed';

  await assert.rejects(
    scaleExperiment(experimentId.toString(), {}, null),
    /Cannot scale an experiment with status completed\./,
  );
});

test('scaling an experiment without a SCALE decision throws', async () => {
  experiment.decision = 'STOP';

  await assert.rejects(
    scaleExperiment(experimentId.toString(), {}, null),
    /Can only scale an experiment with a SCALE decision\./,
  );
});

test('scaling an experiment without an assignment seed throws', async () => {
  experiment.results.assignmentSeed = undefined;

  await assert.rejects(
    scaleExperiment(experimentId.toString(), {}, null),
    /Experiment has no assignment seed\./,
  );
});

test('successful scaling adds customers disjoint from both existing groups', async () => {
  const existingCustomerIds = new Set([
    ...experiment.controlCustomerIds,
    ...experiment.treatmentCustomerIds,
  ].map((id) => id.toString()));

  const scaled = await scaleExperiment(experimentId.toString(), { additionalAudienceSize: 3 }, null);
  const controlIds = scaled.controlCustomerIds;
  const treatmentIds = scaled.treatmentCustomerIds;
  const allAssignedIds = [...controlIds, ...treatmentIds];

  assert.equal(new Set(allAssignedIds).size, allAssignedIds.length);
  assert.equal(allAssignedIds.filter((id) => existingCustomerIds.has(id)).length, existingCustomerIds.size);
  assert.equal(new Set(controlIds).size, controlIds.length);
  assert.equal(new Set(treatmentIds).size, treatmentIds.length);
  assert.equal(auditEvents.at(-1).action, 'EXPERIMENT_SCALED');
});

test('scaling beyond the exposure cap throws without changing audience groups', async () => {
  experiment.results.maxExposurePercent = 0.2;
  const controlBefore = experiment.controlCustomerIds.slice();
  const treatmentBefore = experiment.treatmentCustomerIds.slice();

  await assert.rejects(
    scaleExperiment(experimentId.toString(), { additionalAudienceSize: 1 }, null),
    /Scaling would exceed the maximum exposure cap\./,
  );

  assert.deepEqual(experiment.controlCustomerIds, controlBefore);
  assert.deepEqual(experiment.treatmentCustomerIds, treatmentBefore);
  assert.equal(experiment.scaleEvents.length, 0);
  assert.equal(experiment.lastScaledAt, null);
});

test('successful scaling appends one scale event with the added customer count', async () => {
  const assignedBefore = experiment.controlCustomerIds.length + experiment.treatmentCustomerIds.length;

  const scaled = await scaleExperiment(experimentId.toString(), { additionalAudienceSize: 3 }, null);
  const event = experiment.scaleEvents.at(-1);
  const assignedAfter = scaled.controlCustomerIds.length + scaled.treatmentCustomerIds.length;

  assert.equal(experiment.scaleEvents.length, 1);
  assert.equal(event.addedControlCount + event.addedTreatmentCount, assignedAfter - assignedBefore);
  assert.equal(event.assignmentSeed, 42);
  assert.equal(event.audienceSizeAfter, assignedAfter);
  assert.ok(experiment.lastScaledAt instanceof Date);
});
