import test from "node:test";
import assert from "node:assert/strict";

import {
  EQUIPMENT,
  HYDRONIC_LOOPS,
  MAU_PROCESS_STAGES,
  REFRIGERATION_CYCLE,
  WATER_CIRCUITS,
  getEquipmentById,
} from "../src/data/plant-data.js";

test("plant data includes the key water-cooled HVAC equipment", () => {
  const ids = new Set(EQUIPMENT.map((equipment) => equipment.id));

  for (const id of ["CH-01", "P-CHW-01", "P-CW-01", "CT-01", "MAU-01"]) {
    assert.equal(ids.has(id), true, `${id} should be present`);
  }

  assert.equal(getEquipmentById("CH-01").type, "screw-chiller");
  assert.equal(getEquipmentById("UNKNOWN"), null);
});

test("water circuits encode the correct operating direction", () => {
  const circuits = Object.fromEntries(WATER_CIRCUITS.map((circuit) => [circuit.id, circuit]));

  assert.deepEqual(circuits.chws.route, ["CH-01", "HEADER-CHWS", "MAU-01"]);
  assert.deepEqual(circuits.chwr.route, ["MAU-01", "HEADER-CHWR", "P-CHW-01", "CH-01"]);
  assert.deepEqual(circuits.cws.route, ["CT-01", "P-CW-01", "CH-01"]);
  assert.deepEqual(circuits.cwr.route, ["CH-01", "CT-01"]);

  assert.equal(new Set(WATER_CIRCUITS.map((circuit) => circuit.color)).size, 4);
  assert.equal(WATER_CIRCUITS.every((circuit) => circuit.flowM3h > 0), true);
});

test("refrigeration cycle follows the physical four-stage order", () => {
  assert.deepEqual(
    REFRIGERATION_CYCLE.map((stage) => stage.id),
    ["compression", "condensation", "expansion", "evaporation"],
  );
  assert.equal(REFRIGERATION_CYCLE.every((stage) => stage.component && stage.color), true);
});

test("equipment metrics expose useful display values with units", () => {
  const chiller = getEquipmentById("CH-01");
  const values = chiller.metrics.map((metric) => `${metric.label}:${metric.value}${metric.unit}`);

  assert.deepEqual(values, ["冷冻供水:7.0°C", "冷冻回水:12.0°C", "流量:468m³/h", "COP:5.82"]);
});

test("MAU process stages explain the eight treatment functions in order", () => {
  assert.equal(Array.isArray(MAU_PROCESS_STAGES), true);
  assert.deepEqual(
    MAU_PROCESS_STAGES.map((stage) => stage.id),
    ["intake", "filtration", "cooling", "reheat", "humidification", "fan", "silencer", "supply"],
  );
  assert.equal(MAU_PROCESS_STAGES.every((stage, index) => stage.index === index + 1 && stage.title && stage.detail), true);
});

test("hydronic loop descriptions follow chilled-water and cooling-water physics", () => {
  assert.equal(Array.isArray(HYDRONIC_LOOPS), true);
  const loops = Object.fromEntries(HYDRONIC_LOOPS.map((loop) => [loop.id, loop]));

  assert.deepEqual(loops.chilled.steps.map((step) => step.id), ["chwr", "chw-pump", "evaporator", "chws", "mau-coil"]);
  assert.deepEqual(loops.cooling.steps.map((step) => step.id), ["cws", "cw-pump", "condenser", "cwr", "cooling-tower"]);
});
