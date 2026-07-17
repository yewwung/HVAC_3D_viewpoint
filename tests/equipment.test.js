import test from "node:test";
import assert from "node:assert/strict";

import { buildScrewChiller } from "../src/scene/equipment/chiller.js";
import { buildCoolingTower } from "../src/scene/equipment/cooling-tower.js";
import { buildMau } from "../src/scene/equipment/mau.js";
import { buildPump } from "../src/scene/equipment/pump.js";
import { setEquipmentXray } from "../src/scene/equipment/xray.js";

test("pump contains visible hydraulic and drive cutaway layers", () => {
  const pump = buildPump({ id: "P-CHW-01" });

  for (const name of [
    "volute-shell",
    "pump-impeller",
    "motor-rotor",
    "pump-internal-flow",
    "pump-cutaway-rim",
    "pump-volute-water-volume",
    "pump-motor-stator",
    "pump-shaft",
    "pump-mechanical-seal",
  ]) {
    assert.ok(pump.getObjectByName(name), `${name} should exist`);
  }
  assert.ok(pump.userData.animation.rotors.length >= 2);
  assert.ok(pump.userData.animation.fluidPaths.length >= 1);
  assert.ok(pump.userData.animation.fluidPaths[0].particleCount >= 12);
  assert.equal(pump.getObjectByName("pump-xray-layers").visible, false);
});

test("cooling tower contains the water and air treatment layers", () => {
  const tower = buildCoolingTower({ id: "CT-01" });

  for (const name of [
    "tower-shell",
    "spray-system",
    "fill-media",
    "collection-basin",
    "fan-rotor",
    "falling-water",
    "rising-air",
    "basin-water",
    "drift-eliminator",
    "tower-air-plenum",
    "spray-cones",
  ]) {
    assert.ok(tower.getObjectByName(name), `${name} should exist`);
  }
  assert.ok(tower.userData.animation.rotors.length >= 1);
  assert.ok(tower.userData.animation.droplets.length >= 48);
  assert.ok(tower.userData.animation.airflow.length >= 18);
  assert.equal(tower.getObjectByName("tower-xray-layers").visible, false);
});

test("MAU exposes each functional section in airflow order", () => {
  const mau = buildMau({ id: "MAU-01" });
  const sections = [
    "intake-louver",
    "pre-filter",
    "medium-filter",
    "cooling-coil",
    "heating-section",
    "humidifier",
    "supply-fan",
    "outlet-section",
  ];

  const cinematicLayers = [
    "airflow-warm-zone",
    "airflow-cool-zone",
    "mau-hydronic-controls",
    "mau-chws-control-valve",
    "mau-chwr-balancing-valve",
    "mau-section-markers",
  ];

  [...sections, ...cinematicLayers].forEach((name) => assert.ok(mau.getObjectByName(name), `${name} should exist`));
  assert.deepEqual(mau.userData.sectionOrder, sections);
  assert.ok(mau.userData.animation.airflow.length >= 60);
  assert.ok(mau.userData.animation.fluidPaths.length >= 4);
  assert.ok(mau.userData.animation.rotors.length >= 1);
  assert.ok(Math.max(...mau.userData.animation.airflow.map((item) => item.speed)) <= 0.1);
  assert.equal(mau.getObjectByName("supply-fan-casing").rotation.y, 0);
  assert.equal(mau.getObjectByName("supply-fan-rotor").rotation.y, 0);
});

test("xray mode fades registered shells and restores their materials", () => {
  const chiller = buildScrewChiller();
  const shell = chiller.userData.shells[0];
  const material = Array.isArray(shell.material) ? shell.material[0] : shell.material;
  const initialOpacity = material.opacity;
  const xrayLayers = chiller.getObjectByName("chiller-xray-layers");
  assert.ok(xrayLayers, "chiller-xray-layers should exist");

  setEquipmentXray(chiller, true);
  assert.ok(material.opacity <= 0.15);
  assert.equal(material.transparent, true);
  assert.equal(xrayLayers.visible, true);

  setEquipmentXray(chiller, false);
  assert.equal(material.opacity, initialOpacity);
  assert.equal(xrayLayers.visible, false);
});
