import * as THREE from "three";

import { COLORS, createMaterialLibrary, emissive, standard } from "./materials.js";
import { box } from "./primitives.js";
import { buildScrewChiller } from "./equipment/chiller.js";
import { buildCoolingTower } from "./equipment/cooling-tower.js";
import { buildMau } from "./equipment/mau.js";
import { buildPump } from "./equipment/pump.js";
import { buildWaterHeader } from "./equipment/water-header.js";
import { setEquipmentXray } from "./equipment/xray.js";
import { buildFlowSystem, setFlowSystemXray, updateFlowSystems } from "./flow-system.js";

export function createPlantModel() {
  const group = new THREE.Group();
  group.name = "HVAC-PLANT";
  const equipment = new Map();
  const materials = createMaterialLibrary();
  const environment = createPlantEnvironment(materials);
  group.add(environment);

  addEquipment(group, equipment, buildScrewChiller({ id: "CH-01", position: [-1.2, 0, -0.2] }));
  addEquipment(group, equipment, buildPump({ id: "P-CHW-01", position: [-5.2, 0, 2.8], color: COLORS.chilledSupply }));
  addEquipment(group, equipment, buildPump({ id: "P-CHW-02", position: [-5.2, 0, 4.2], color: COLORS.chilledSupply }));
  addEquipment(group, equipment, buildPump({ id: "P-CW-01", position: [-5.2, 0, -3.7], color: COLORS.coolingSupply }));
  addEquipment(group, equipment, buildPump({ id: "P-CW-02", position: [-5.2, 0, -5.1], color: COLORS.coolingSupply, running: false }));
  addEquipment(group, equipment, buildCoolingTower({ id: "CT-01", position: [1.8, 0, -5.6] }));
  addEquipment(group, equipment, buildCoolingTower({ id: "CT-02", position: [4.8, 0, -5.6] }));
  addEquipment(group, equipment, buildMau({ id: "MAU-01", position: [4.6, 0, 0.4] }));
  addEquipment(group, equipment, buildWaterHeader({ id: "HEADER-CHWS", position: [2.2, 0.05, 3.1], color: COLORS.chilledSupply }));
  addEquipment(group, equipment, buildWaterHeader({ id: "HEADER-CHWR", position: [2.2, 0.05, 4.55], color: COLORS.chilledReturn }));

  const { network: pipeNetwork, flowSystems } = buildFlowSystem();
  group.add(pipeNetwork);

  const animation = {
    rotors: [],
    droplets: [],
    airflow: [],
    internalFlowParticles: [],
  };
  for (const equipmentObject of equipment.values()) registerEquipmentAnimation(equipmentObject, animation);

  const model = { group, equipment, environment, pipeNetwork, flowSystems, animation };
  setPlantPresentation(model, { mode: "mau", selectedEquipmentId: "MAU-01", pipesVisible: false });
  return model;
}

export function setPlantPresentation(model, state) {
  const mauMode = state.mode === "mau";
  const xrayMode = state.mode === "xray";
  const targetId = mauMode ? "MAU-01" : state.mode === "principle" ? "CH-01" : xrayMode ? state.selectedEquipmentId ?? "CH-01" : null;
  for (const [id, equipment] of model.equipment) {
    setEquipmentXray(equipment, false);
    equipment.visible = targetId ? id === targetId : true;
  }
  if (targetId && model.equipment.has(targetId)) setEquipmentXray(model.equipment.get(targetId), true);
  const environmentVisible = !mauMode && !xrayMode;
  model.environment.visible = environmentVisible;
  model.environment.traverse((object) => {
    object.visible = environmentVisible;
  });
  model.pipeNetwork.visible = !mauMode && state.pipesVisible !== false;
  setFlowSystemXray(model.pipeNetwork, state.mode === "xray");
  model.group.userData.presentationMode = state.mode;
  model.group.userData.focusedEquipmentId = targetId;
}

export function updatePlantModel(model, delta, elapsed, options = {}) {
  const motionScale = options.motionScale ?? 1;
  updateFlowSystems(model.flowSystems, elapsed, motionScale);
  for (const rotor of model.animation.rotors) {
    const speed = rotor.name.includes("tower") ? 1.3 : rotor.name.includes("screw") ? 2.4 : 2.05;
    const amount = delta * speed * motionScale;
    if (rotor.name.includes("pump-impeller")) rotor.rotation.z -= amount;
    else if (rotor.name.includes("supply-fan")) rotor.rotation.z -= amount;
    else if (rotor.name.includes("fan-rotor")) rotor.rotation.y -= amount;
    else rotor.rotation.x += amount;
  }
  for (const item of model.animation.droplets) updateVerticalParticle(item, elapsed, motionScale, item.speed >= 0);
  for (const item of model.animation.airflow) {
    const speed = Math.abs(item.speed) * motionScale;
    const t = (item.phase + elapsed * speed) % 1;
    if (item.minX !== undefined) item.mesh.position.x = THREE.MathUtils.lerp(item.minX, item.maxX, t);
    else item.mesh.position.y = THREE.MathUtils.lerp(item.minY, item.maxY, t);
    if (item.materials && item.colorZones) {
      const [coolingStart, reheatStart, supplyStart] = item.colorZones;
      const x = item.mesh.position.x;
      item.mesh.material = x < coolingStart
        ? item.materials.warm
        : x < reheatStart
          ? item.materials.cool
          : x < supplyStart
            ? item.materials.warm
            : item.materials.supply;
      const pulse = 0.88 + Math.sin((t + item.phase) * Math.PI * 2) * 0.14;
      item.mesh.scale.y = pulse;
      item.mesh.scale.z = pulse;
    } else {
      item.mesh.material.opacity = 0.32 + Math.sin((t + item.phase) * Math.PI) * 0.38;
    }
  }
  for (const item of model.animation.internalFlowParticles) {
    const t = (item.phase + elapsed * item.speed * motionScale) % 1;
    const point = Number.isFinite(t) ? item.curve.getPointAt(t) : null;
    if (point) item.mesh.position.copy(point);
  }
}

function addEquipment(group, map, equipment) {
  group.add(equipment);
  map.set(equipment.userData.equipmentId, equipment);
}

function createPlantEnvironment(materials) {
  const group = new THREE.Group();
  group.name = "plant-environment";
  const floor = box([19, 0.16, 15], standard(0x263238, { roughness: 0.72, metalness: 0.16 }), { position: [0, -0.11, 0], name: "plant-floor", castShadow: false });
  group.add(floor);
  const grid = new THREE.GridHelper(19, 38, 0x53676b, 0x36474a);
  grid.name = "plant-grid";
  grid.position.y = -0.015;
  grid.scale.z = 15 / 19;
  grid.material.transparent = true;
  grid.material.opacity = 0.42;
  group.add(grid);
  const aisleMaterial = standard(0x879596, { roughness: 0.64, metalness: 0.24 });
  for (const [position, size] of [
    [[-1.2, -0.015, -0.2], [6.4, 0.055, 2.6]],
    [[-5.2, -0.015, 0.3], [3.0, 0.055, 12.5]],
    [[3.4, -0.015, -5.6], [6.7, 0.055, 2.3]],
    [[4.6, -0.015, 0.4], [7.2, 0.055, 2.2]],
  ]) group.add(box(size, aisleMaterial, { position, name: `equipment-pad-${position.join("-")}`, castShadow: false }));
  return group;
}

function registerEquipmentAnimation(equipment, animation) {
  const equipmentAnimation = equipment.userData.animation ?? {};
  animation.rotors.push(...(equipmentAnimation.rotors ?? []));
  animation.droplets.push(...(equipmentAnimation.droplets ?? []));
  animation.airflow.push(...(equipmentAnimation.airflow ?? []));
  for (const path of equipmentAnimation.fluidPaths ?? []) {
    const material = emissive(path.color);
    const geometry = new THREE.SphereGeometry(0.045, 10, 8);
    const count = path.particleCount ?? 5;
    for (let index = 0; index < count; index += 1) {
      const particle = new THREE.Mesh(geometry, material);
      particle.name = `${path.id}-internal-particle-${index + 1}`;
      equipment.add(particle);
      equipment.userData.internals?.push(particle);
      animation.internalFlowParticles.push({ mesh: particle, curve: path.curve, phase: index / count, speed: path.speed ?? 0.1 });
    }
  }
}

function updateVerticalParticle(item, elapsed, motionScale, falling) {
  const speed = Math.abs(item.speed) * motionScale;
  const t = (item.phase + elapsed * speed) % 1;
  item.mesh.position.y = falling
    ? THREE.MathUtils.lerp(item.maxY, item.minY, t)
    : THREE.MathUtils.lerp(item.minY, item.maxY, t);
}
