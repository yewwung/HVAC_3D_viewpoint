import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

import { buildScrewChiller } from "../src/scene/equipment/chiller.js";

test("screw chiller exposes the major reference-image components", () => {
  const chiller = buildScrewChiller();

  assert.equal(chiller.name, "CH-01");
  assert.equal(chiller.userData.equipmentId, "CH-01");
  for (const name of [
    "evaporator-shell",
    "evaporator-tube-bundle",
    "condenser-shell",
    "condenser-tube-bundle",
    "compressor",
    "control-cabinet",
    "refrigerant-loop",
    "screw-rotor-a",
    "screw-rotor-b",
    "evaporator-cutaway-shell",
    "evaporator-fluid-volume",
    "evaporator-tube-sheet",
    "condenser-cutaway-shell",
    "condenser-fluid-volume",
    "condenser-tube-sheet",
    "compressor-cutaway-casing",
    "compressor-rotor-chamber",
  ]) {
    assert.ok(chiller.getObjectByName(name), `${name} should exist`);
  }
});

test("screw chiller separates xray shells from internal working parts", () => {
  const chiller = buildScrewChiller();

  assert.ok(chiller.userData.shells.length >= 8);
  assert.ok(chiller.userData.internals.length >= 16);
  assert.equal(chiller.userData.shells.every((object) => object instanceof THREE.Object3D), true);
  assert.equal(chiller.userData.internals.every((object) => object instanceof THREE.Object3D), true);
  assert.equal(chiller.userData.internals.includes(chiller.getObjectByName("evaporator-tube-bundle")), true);
  assert.equal(chiller.userData.internals.includes(chiller.getObjectByName("screw-rotor-a")), true);
  const xrayLayers = chiller.getObjectByName("chiller-xray-layers");
  assert.ok(xrayLayers, "chiller-xray-layers should exist");
  assert.equal(xrayLayers.userData.xrayOnly, true);
  assert.equal(xrayLayers.visible, false);
});

test("screw chiller registers animated rotors and fluid paths", () => {
  const chiller = buildScrewChiller();

  assert.equal(chiller.userData.animation.rotors.length, 2);
  assert.ok(chiller.userData.animation.fluidPaths.length >= 4);
  assert.equal(chiller.userData.animation.rotors[0].name, "screw-rotor-a");
  assert.equal(chiller.userData.animation.rotors[1].name, "screw-rotor-b");
});
