import test from "node:test";
import assert from "node:assert/strict";

import * as flowModule from "../src/scene/flow-system.js";

test("pipe network uses a transparent shell around a substantial fluid core", () => {
  const { network, flowSystems } = flowModule.buildFlowSystem();
  const route = flowSystems[0].routes[0];

  assert.equal(route.pipe.userData.flowLayer, "shell");
  assert.equal(route.core.userData.flowLayer, "fluid");
  assert.ok(route.core.geometry.parameters.radius >= route.pipe.geometry.parameters.radius * 0.6);
  assert.equal(flowSystems[0].particles[0].mesh.geometry.type, "CapsuleGeometry");
  assert.equal(network.userData.xrayEnabled, false);
});

test("pipe xray fades the wall and strengthens the fluid core", () => {
  assert.equal(typeof flowModule.setFlowSystemXray, "function");
  const { network, flowSystems } = flowModule.buildFlowSystem();
  const route = flowSystems[0].routes[0];

  flowModule.setFlowSystemXray(network, true);

  assert.ok(route.pipe.material.opacity <= 0.2);
  assert.ok(route.core.material.opacity >= 0.65);
  assert.equal(network.userData.xrayEnabled, true);
});
