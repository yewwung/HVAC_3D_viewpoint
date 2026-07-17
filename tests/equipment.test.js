import test from "node:test";
import assert from "node:assert/strict";

import { buildScrewChiller } from "../src/scene/equipment/chiller.js";
import { buildCoolingTower } from "../src/scene/equipment/cooling-tower.js";
import { buildMau } from "../src/scene/equipment/mau.js";
import { buildPump } from "../src/scene/equipment/pump.js";
import { setEquipmentXray } from "../src/scene/equipment/xray.js";

test("pump contains visible hydraulic and drive internals", () => {
  const pump = buildPump({ id: "P-CHW-01" });

  for (const name of ["volute-shell", "pump-impeller", "motor-rotor", "pump-internal-flow"]) {
    assert.ok(pump.getObjectByName(name), `${name} should exist`);
  }
  assert.ok(pump.userData.animation.rotors.length >= 2);
  assert.ok(pump.userData.animation.fluidPaths.length >= 1);
});

test("cooling tower contains the water and air treatment layers", () => {
  const tower = buildCoolingTower({ id: "CT-01" });

  for (const name of ["tower-shell", "spray-system", "fill-media", "collection-basin", "fan-rotor", "falling-water", "rising-air"]) {
    assert.ok(tower.getObjectByName(name), `${name} should exist`);
  }
  assert.ok(tower.userData.animation.rotors.length >= 1);
  assert.ok(tower.userData.animation.droplets.length >= 12);
  assert.ok(tower.userData.animation.airflow.length >= 6);
});

test("MAU exposes each functional section in airflow order", () => {
  const mau = buildMau({ id: "MAU-01" });
  const sections = [
    "intake-louver",
    "pre-filter",
    "cooling-coil",
    "heating-section",
    "humidifier",
    "supply-fan",
    "outlet-section",
  ];

  sections.forEach((name) => assert.ok(mau.getObjectByName(name), `${name} should exist`));
  assert.deepEqual(mau.userData.sectionOrder, sections);
  assert.ok(mau.userData.animation.airflow.length >= 12);
  assert.ok(mau.userData.animation.rotors.length >= 1);
});

test("xray mode fades registered shells and restores their materials", () => {
  const chiller = buildScrewChiller();
  const shell = chiller.userData.shells[0];
  const material = Array.isArray(shell.material) ? shell.material[0] : shell.material;
  const initialOpacity = material.opacity;

  setEquipmentXray(chiller, true);
  assert.ok(material.opacity <= 0.15);
  assert.equal(material.transparent, true);

  setEquipmentXray(chiller, false);
  assert.equal(material.opacity, initialOpacity);
});
