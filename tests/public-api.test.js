import test from "node:test";
import assert from "node:assert/strict";

import { createShowcaseApi } from "../src/app/showcase-api.js";
import { createShowcaseState } from "../src/app/showcase-state.js";

test("public API exposes stable software-embedding controls", () => {
  const store = createShowcaseState();
  const calls = [];
  const api = createShowcaseApi(store, {
    focusEquipment: (id) => calls.push(["focus", id]),
    resetView: () => calls.push(["reset"]),
  });

  assert.deepEqual(Object.keys(api).sort(), ["focusEquipment", "getState", "resetView", "setMode", "setXray"]);
  api.setMode("principle");
  api.focusEquipment("MAU-01");
  api.setXray(true);
  api.resetView();

  assert.equal(api.getState().mode, "xray");
  assert.equal(api.getState().selectedEquipmentId, "MAU-01");
  assert.deepEqual(calls, [["focus", "MAU-01"], ["reset"]]);
});

test("public API reports invalid modes without changing state", () => {
  const store = createShowcaseState();
  const api = createShowcaseApi(store, {});

  assert.equal(api.setMode("wireframe"), false);
  assert.equal(api.getState().mode, "mau");
});
