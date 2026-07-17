import test from "node:test";
import assert from "node:assert/strict";

import { createPlantModel, setPlantPresentation } from "../src/scene/create-plant-model.js";

test("plant model assembles equipment and four animated water circuits", () => {
  const model = createPlantModel();

  for (const id of ["CH-01", "P-CHW-01", "P-CHW-02", "P-CW-01", "P-CW-02", "CT-01", "CT-02", "MAU-01", "HEADER-CHWS", "HEADER-CHWR"]) {
    assert.equal(model.equipment.has(id), true, `${id} should be in the scene`);
  }
  assert.deepEqual(model.flowSystems.map((system) => system.id), ["chws", "chwr", "cws", "cwr"]);
  assert.equal(model.flowSystems.every((system) => system.particles.length > 0), true);
  assert.ok(model.animation.rotors.length >= 10);
});

test("plant presentation applies xray only to the focused equipment", () => {
  const model = createPlantModel();
  const chiller = model.equipment.get("CH-01");
  const mau = model.equipment.get("MAU-01");

  setPlantPresentation(model, { mode: "xray", selectedEquipmentId: "MAU-01", pipesVisible: true });
  assert.equal(mau.userData.xrayEnabled, true);
  assert.equal(chiller.userData.xrayEnabled, false);
  assert.equal(mau.visible, true);
  assert.equal(chiller.visible, false);
  assert.equal(model.environment.visible, false);
  assert.equal(model.pipeNetwork.userData.xrayEnabled, true);
  assert.equal(model.pipeNetwork.visible, true);

  setPlantPresentation(model, { mode: "overview", selectedEquipmentId: null, pipesVisible: false });
  assert.equal(mau.userData.xrayEnabled, false);
  assert.equal(model.pipeNetwork.userData.xrayEnabled, false);
  assert.equal(model.pipeNetwork.visible, false);
});

test("principle mode opens the chiller internals by default", () => {
  const model = createPlantModel();
  setPlantPresentation(model, { mode: "principle", selectedEquipmentId: null, pipesVisible: true });

  assert.equal(model.equipment.get("CH-01").userData.xrayEnabled, true);
  assert.equal(model.equipment.get("MAU-01").userData.xrayEnabled, false);
  assert.equal(model.equipment.get("CH-01").visible, true);
  assert.equal(model.equipment.get("MAU-01").visible, false);

  setPlantPresentation(model, { mode: "overview", selectedEquipmentId: null, pipesVisible: true });
  assert.equal(model.equipment.get("MAU-01").visible, true);
});

test("MAU mode isolates the cutaway and hides the plant environment", () => {
  const model = createPlantModel();
  setPlantPresentation(model, { mode: "mau", selectedEquipmentId: "MAU-01", pipesVisible: false });

  assert.equal(model.equipment.get("MAU-01").visible, true);
  assert.equal(model.equipment.get("MAU-01").userData.xrayEnabled, true);
  assert.equal(model.equipment.get("CH-01").visible, false);
  assert.equal(model.pipeNetwork.visible, false);
  assert.equal(model.group.getObjectByName("plant-floor").visible, false);
  assert.equal(model.group.getObjectByName("plant-grid").visible, false);
});
