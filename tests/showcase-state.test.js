import test from "node:test";
import assert from "node:assert/strict";

import { SHOWCASE_MODES, createShowcaseState } from "../src/app/showcase-state.js";

test("showcase state starts in a presentation-ready overview", () => {
  const store = createShowcaseState();

  assert.deepEqual(store.getState(), {
    mode: "overview",
    tourEnabled: true,
    pipesVisible: true,
    labelsVisible: true,
    xrayEnabled: false,
    selectedEquipmentId: null,
  });
});

test("showcase state accepts the three supported presentation modes", () => {
  const store = createShowcaseState();

  assert.deepEqual(SHOWCASE_MODES, ["overview", "principle", "xray"]);
  assert.equal(store.setMode("principle"), true);
  assert.equal(store.getState().mode, "principle");
  assert.equal(store.getState().xrayEnabled, false);

  assert.equal(store.setMode("xray"), true);
  assert.equal(store.getState().mode, "xray");
  assert.equal(store.getState().xrayEnabled, true);
});

test("invalid modes are rejected without notifying subscribers", () => {
  const store = createShowcaseState();
  let notificationCount = 0;
  store.subscribe(() => {
    notificationCount += 1;
  });

  assert.equal(store.setMode("thermal-camera"), false);
  assert.equal(store.getState().mode, "overview");
  assert.equal(notificationCount, 0);
});

test("controls update visibility, tour, xray and selected equipment", () => {
  const store = createShowcaseState();

  store.toggleTour();
  store.togglePipes();
  store.toggleLabels();
  store.selectEquipment("CH-01");
  store.setXray(true);

  assert.deepEqual(store.getState(), {
    mode: "xray",
    tourEnabled: false,
    pipesVisible: false,
    labelsVisible: false,
    xrayEnabled: true,
    selectedEquipmentId: "CH-01",
  });
});

test("subscriber receives an immutable snapshot and can unsubscribe", () => {
  const store = createShowcaseState();
  const snapshots = [];
  const unsubscribe = store.subscribe((state) => snapshots.push(state));

  store.selectEquipment("P-CHW-01");
  unsubscribe();
  store.selectEquipment("CT-01");

  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].selectedEquipmentId, "P-CHW-01");
  assert.equal(Object.isFrozen(snapshots[0]), true);
});
