import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

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
});

test("MAU treatment faces are orthogonal", () => {
  const mau = buildMau({ id: "MAU-01" });
  const treatmentFaces = [];
  mau.traverse((object) => {
    if (
      ["pre-filter-media", "medium-filter-media"].includes(object.name)
      || object.name.startsWith("cooling-fin-")
      || object.name.startsWith("heating-fin-")
    ) {
      treatmentFaces.push(object);
    }
  });

  assert.equal(treatmentFaces.length, 22);
  for (const face of treatmentFaces) {
    assert.ok(Math.abs(face.rotation.z) < 1e-8, `${face.name} should be vertical`);
  }
});

test("MAU uses an inline EC backward-curved centrifugal plug fan", () => {
  const mau = buildMau({ id: "MAU-01" });
  const fan = mau.getObjectByName("supply-fan");
  const rotor = mau.getObjectByName("supply-fan-rotor");
  const blades = rotor.children.filter((child) => child.name.startsWith("supply-fan-blade-"));

  for (const name of [
    "supply-fan-inlet-panel",
    "supply-fan-inlet-cone",
    "supply-fan-front-shroud",
    "supply-fan-rear-disc",
    "supply-fan-drive-motor",
    "supply-fan-support-frame",
  ]) assert.ok(mau.getObjectByName(name), `${name} should exist`);

  for (let index = 1; index <= 4; index += 1) {
    assert.ok(mau.getObjectByName(`supply-fan-isolator-${index}`));
  }

  assert.equal(blades.length, 7);
  for (const blade of blades) {
    blade.geometry.computeBoundingBox();
    const size = blade.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.equal(blade.geometry.type, "ExtrudeGeometry");
    assert.ok(size.z >= 0.2, `${blade.name} should have axial depth`);
  }

  const axis = new THREE.Vector3(0, 0, 1).applyQuaternion(fan.quaternion).normalize();
  assert.ok(Math.abs(axis.x) > 0.999);
  assert.ok(Math.abs(axis.y) < 1e-8);
  assert.ok(Math.abs(axis.z) < 1e-8);

  mau.updateMatrixWorld(true);
  const inletX = mau.getObjectByName("supply-fan-inlet-cone").getWorldPosition(new THREE.Vector3()).x;
  const motorX = mau.getObjectByName("supply-fan-drive-motor").getWorldPosition(new THREE.Vector3()).x;
  assert.ok(inletX < motorX, "inlet should be upstream of the motor");
  assert.equal(mau.getObjectByName("supply-fan-hub"), undefined);
});

test("MAU airflow turns through the centrifugal fan before plenum recovery", () => {
  const mau = buildMau({ id: "MAU-01" });
  const paths = mau.userData.animation.airflow.filter((item) => item.curve);
  assert.ok(paths.length >= 60);
  assert.deepEqual(mau.userData.fanAirflowStages, ["axial-intake", "radial-discharge", "plenum-recovery"]);

  const [beforeEye, eye, radial, recovered] = [1, 2, 3, 4].map((index) => paths[0].curve.points[index]);
  const eyeRadius = Math.hypot(eye.y - 1.02, eye.z);
  const radialRadius = Math.hypot(radial.y - 1.02, radial.z);
  assert.ok(beforeEye.x < eye.x);
  assert.ok(radialRadius > eyeRadius + 0.2);
  assert.ok(recovered.x > radial.x);
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
