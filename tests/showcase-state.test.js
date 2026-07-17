import test from "node:test";
import assert from "node:assert/strict";

import { SHOWCASE_MODES, createShowcaseState } from "../src/app/showcase-state.js";

test("showcase state starts in the cinematic MAU cutaway", () => {
  const store = createShowcaseState();

  assert.deepEqual(store.getState(), {
    mode: "mau",
    tourEnabled: false,
    pipesVisible: false,
    labelsVisible: false,
    xrayEnabled: true,
    selectedEquipmentId: "MAU-01",
  });
});

test("showcase state accepts the four supported presentation modes", () => {
  const store = createShowcaseState();

  assert.deepEqual(SHOWCASE_MODES, ["mau", "overview", "principle", "xray"]);
  assert.equal(store.setMode("principle"), true);
  assert.equal(store.getState().mode, "principle");
  assert.equal(store.getState().xrayEnabled, false);

  assert.equal(store.setMode("xray"), true);
  assert.equal(store.getState().mode, "xray");
  assert.equal(store.getState().xrayEnabled, true);

  assert.equal(store.setMode("mau"), true);
  assert.equal(store.getState().mode, "mau");
  assert.equal(store.getState().selectedEquipmentId, "MAU-01");
  assert.equal(store.getState().xrayEnabled, true);
});

test("invalid modes are rejected without notifying subscribers", () => {
  const store = createShowcaseState();
  let notificationCount = 0;
  store.subscribe(() => {
    notificationCount += 1;
  });

  assert.equal(store.setMode("thermal-camera"), false);
  assert.equal(store.getState().mode, "mau");
  assert.equal(notificationCount, 0);
});

test("controls update visibility, tour, xray and selected equipment", () => {
  const store = createShowcaseState();

  store.setMode("overview");
  store.toggleTour();
  store.togglePipes();
  store.toggleLabels();
  store.selectEquipment("CH-01");
  store.setXray(true);

  assert.deepEqual(store.getState(), {
    mode: "xray",
    tourEnabled: true,
    pipesVisible: true,
    labelsVisible: true,
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

test("equipment xray keeps transparent pipe flow visible", () => {
  const store = createShowcaseState();

  store.setXray(true);

  assert.equal(store.getState().mode, "xray");
  assert.equal(store.getState().pipesVisible, true);
});
