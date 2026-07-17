import * as THREE from "three";

import { COLORS, createMaterialLibrary, emissive, physical, standard } from "../materials.js";
import { box, createGauge, cylinder, markEquipment, tube } from "../primitives.js";

const AIRFLOW_PARTICLE_COUNT = 84;
const AIRFLOW_COLORS = Object.freeze({
  warm: 0xff4d52,
  cool: 0x18c8ff,
  supply: 0x55f1df,
});

const SECTION_ORDER = Object.freeze([
  "intake-louver",
  "pre-filter",
  "cooling-coil",
  "heating-section",
  "humidifier",
  "supply-fan",
  "outlet-section",
]);

export function buildMau(options = {}) {
  const id = options.id ?? "MAU-01";
  const materials = createMaterialLibrary();
  const group = new THREE.Group();
  group.name = id;
  group.position.fromArray(options.position ?? [0, 0, 0]);
  const shells = [];
  const internals = [];
  const rotors = [];
  const airflow = [];
  const fluidPaths = [];

  group.add(box([6.7, 0.16, 1.82], materials.darkMetal, { position: [0, 0.1, 0], name: "mau-base" }));
  for (const x of [-2.8, -1.9, -1.05, -0.15, 0.72, 1.62, 2.75]) {
    group.add(box([0.08, 1.72, 1.72], materials.cabinetEdge, { position: [x, 1.02, 0], name: `mau-partition-${x}` }));
  }

  const shell = createMauShell(materials);
  group.add(shell);
  shells.push(shell);

  const intake = createLouver("intake-louver", -3.08, materials, 0x6c7d7d);
  group.add(intake);
  internals.push(intake);

  const preFilter = createFilter("pre-filter", -2.35, standard(0x7ca6aa, { roughness: 0.55, metalness: 0.14 }), materials);
  group.add(preFilter);
  internals.push(preFilter);

  const coolingCoil = createCoil(materials, fluidPaths);
  coolingCoil.position.x = -1.48;
  group.add(coolingCoil);
  internals.push(coolingCoil);

  const heating = createHeatingSection(materials);
  heating.position.x = -0.58;
  group.add(heating);
  internals.push(heating);

  const humidifier = createHumidifier(materials);
  humidifier.position.x = 0.3;
  group.add(humidifier);
  internals.push(humidifier);

  const fan = createSupplyFan(materials);
  fan.position.set(1.18, 1.02, 0);
  group.add(fan);
  internals.push(fan);
  rotors.push(fan.getObjectByName("supply-fan-rotor"));

  const outlet = createLouver("outlet-section", 3.08, materials, 0x708789);
  outlet.rotation.y = Math.PI;
  group.add(outlet);
  internals.push(outlet);

  const airflowZones = createAirflowZones();
  group.add(airflowZones);
  internals.push(airflowZones);

  const hydronicControls = createHydronicControls(materials, fluidPaths);
  group.add(hydronicControls);
  internals.push(hydronicControls);

  const airGroup = new THREE.Group();
  airGroup.name = "mau-airflow";
  const airGeometry = new THREE.CapsuleGeometry(0.024, 0.18, 4, 8);
  const airMaterials = {
    warm: createAirMaterial(AIRFLOW_COLORS.warm),
    cool: createAirMaterial(AIRFLOW_COLORS.cool),
    supply: createAirMaterial(AIRFLOW_COLORS.supply),
  };
  for (let index = 0; index < AIRFLOW_PARTICLE_COUNT; index += 1) {
    const particle = new THREE.Mesh(airGeometry, airMaterials.warm);
    particle.rotation.z = Math.PI / 2;
    const laneY = 0.42 + (index % 7) * 0.205 + Math.sin(index * 1.7) * 0.035;
    const laneZ = -0.58 + (index % 6) * 0.232 + Math.cos(index * 1.3) * 0.025;
    particle.position.set(-3.04 + ((index * 0.397) % 6.08), laneY, laneZ);
    particle.scale.set(0.75 + (index % 4) * 0.12, 0.8, 0.8);
    particle.name = `mau-air-particle-${index + 1}`;
    particle.renderOrder = 8;
    airGroup.add(particle);
    airflow.push({
      mesh: particle,
      phase: index / AIRFLOW_PARTICLE_COUNT,
      minX: -3.04,
      maxX: 3.04,
      speed: 0.36 + (index % 7) * 0.018,
      colorZones: [-1.56, -0.82, -0.16],
      materials: airMaterials,
    });
  }
  group.add(airGroup);
  internals.push(airGroup);

  const drainPan = box([1.0, 0.08, 1.34], standard(0x60808b, { roughness: 0.3, metalness: 0.68 }), { position: [-1.48, 0.3, 0], name: "condensate-pan" });
  group.add(drainPan);
  internals.push(drainPan);

  group.userData.shells = shells;
  group.userData.internals = internals;
  group.userData.sectionOrder = [...SECTION_ORDER];
  group.userData.animation = { rotors, airflow, fluidPaths, droplets: humidifier.userData.droplets };
  group.userData.focusPoint = new THREE.Vector3(0, 1.05, 0);
  group.userData.focusDistance = 7.15;
  markEquipment(group, id);
  return group;
}

function createAirMaterial(color) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    toneMapped: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function createAirflowZones() {
  const group = new THREE.Group();
  group.name = "mau-airflow-zones";
  group.add(createAirflowZone("airflow-warm-zone", [-2.26, 1.04, 0], [1.48, 1.42, 1.4], AIRFLOW_COLORS.warm, 0.09));
  group.add(createAirflowZone("airflow-cool-zone", [-1.13, 1.04, 0], [0.72, 1.42, 1.4], AIRFLOW_COLORS.cool, 0.12));
  group.add(createAirflowZone("airflow-reheat-zone", [-0.54, 1.04, 0], [0.42, 1.42, 1.4], AIRFLOW_COLORS.warm, 0.08));
  group.add(createAirflowZone("airflow-supply-zone", [1.42, 1.04, 0], [3.2, 1.42, 1.4], AIRFLOW_COLORS.supply, 0.08));
  return group;
}

function createAirflowZone(name, position, size, color, opacity) {
  const group = new THREE.Group();
  group.name = name;
  const glowMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    toneMapped: false,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  const glow = box(size, glowMaterial, { position, name: `${name}-glow`, castShadow: false, receiveShadow: false });
  glow.renderOrder = 2;
  group.add(glow);
  const light = new THREE.PointLight(color, name.includes("cool") ? 2.0 : 1.35, 3.1, 2);
  light.position.fromArray(position);
  light.name = `${name}-light`;
  group.add(light);
  return group;
}

function createHydronicControls(materials, fluidPaths) {
  const group = new THREE.Group();
  group.name = "mau-hydronic-controls";
  const chwsMaterial = standard(COLORS.chilledSupply, { roughness: 0.2, metalness: 0.58, emissive: COLORS.chilledSupply, emissiveIntensity: 0.34 });
  const chwrMaterial = standard(COLORS.chilledReturn, { roughness: 0.2, metalness: 0.58, emissive: COLORS.chilledReturn, emissiveIntensity: 0.26 });

  const supply = tube([
    [-2.78, -0.18, 0.96],
    [-2.28, -0.18, 0.96],
    [-1.92, -0.18, 0.96],
    [-1.78, 0.35, 0.7],
  ], 0.075, chwsMaterial, { name: "mau-chws-external", tubularSegments: 56 });
  group.add(supply);
  fluidPaths.push({ id: "mau-chws-external", curve: supply.userData.curve, color: COLORS.chilledSupply, speed: 0.22, particleCount: 8 });

  const returnPipe = tube([
    [-1.18, 0.35, 0.7],
    [-1.04, -0.04, 1.04],
    [-0.62, -0.04, 1.04],
    [-0.16, -0.04, 1.04],
  ], 0.065, chwrMaterial, { name: "mau-chwr-external", tubularSegments: 56 });
  group.add(returnPipe);
  fluidPaths.push({ id: "mau-chwr-external", curve: returnPipe.userData.curve, color: COLORS.chilledReturn, speed: 0.18, particleCount: 8 });

  const controlValve = createHydronicValve({
    name: "mau-chws-control-valve",
    pipeColor: COLORS.chilledSupply,
    materials,
    actuator: true,
  });
  controlValve.position.set(-2.28, -0.18, 0.96);
  group.add(controlValve);

  const balancingValve = createHydronicValve({
    name: "mau-chwr-balancing-valve",
    pipeColor: COLORS.chilledReturn,
    materials,
    actuator: false,
  });
  balancingValve.position.set(-0.62, -0.04, 1.04);
  group.add(balancingValve);

  const supplyGauge = createGauge({ material: materials.chrome, faceMaterial: materials.cabinet, needleMaterial: materials.darkMetal, name: "mau-chws-pressure-gauge" });
  supplyGauge.position.set(-1.92, 0.05, 1.04);
  supplyGauge.scale.setScalar(0.72);
  group.add(supplyGauge);

  const returnGauge = createGauge({ material: materials.chrome, faceMaterial: materials.cabinet, needleMaterial: materials.darkMetal, name: "mau-chwr-pressure-gauge" });
  returnGauge.position.set(-1.02, 0.17, 1.12);
  returnGauge.scale.setScalar(0.72);
  group.add(returnGauge);
  return group;
}

function createHydronicValve({ name, pipeColor, materials, actuator }) {
  const group = new THREE.Group();
  group.name = name;
  const bodyMaterial = standard(pipeColor, { roughness: 0.24, metalness: 0.68, emissive: pipeColor, emissiveIntensity: 0.18 });
  group.add(cylinder(0.115, 0.42, bodyMaterial, { rotation: [0, 0, Math.PI / 2], segments: 28, name: `${name}-body` }));
  for (const x of [-0.2, 0.2]) {
    group.add(cylinder(0.16, 0.055, materials.chrome, { position: [x, 0, 0], rotation: [0, 0, Math.PI / 2], segments: 28, name: `${name}-flange-${x}` }));
  }
  group.add(cylinder(0.035, 0.18, materials.brass, { position: [0, 0.14, 0], segments: 16, name: `${name}-stem` }));
  if (actuator) {
    const actuatorMaterial = standard(0xe857ff, { roughness: 0.28, metalness: 0.46, emissive: 0xe857ff, emissiveIntensity: 0.24 });
    group.add(box([0.31, 0.24, 0.26], actuatorMaterial, { position: [0, 0.31, 0], name: `${name}-actuator` }));
    group.add(box([0.2, 0.035, 0.12], materials.screen, { position: [0, 0.31, 0.135], name: `${name}-position-display` }));
  } else {
    const wheelMaterial = standard(0xe857ff, { roughness: 0.3, metalness: 0.58, emissive: 0xe857ff, emissiveIntensity: 0.16 });
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 10, 28), wheelMaterial);
    wheel.name = `${name}-handwheel`;
    wheel.position.y = 0.28;
    wheel.rotation.x = Math.PI / 2;
    group.add(wheel);
  }
  return group;
}

function createMauShell(materials) {
  const group = new THREE.Group();
  group.name = "mau-shell";
  const panel = physical(0xd4dada, { roughness: 0.35, metalness: 0.5, transparent: true, opacity: 0.94 });
  group.add(box([6.4, 0.1, 1.7], panel, { position: [0, 1.88, 0], name: "mau-roof" }));
  group.add(box([6.4, 0.1, 1.7], panel, { position: [0, 0.22, 0], name: "mau-floor" }));
  group.add(box([6.4, 1.62, 0.08], panel, { position: [0, 1.05, -0.82], name: "mau-back-panel" }));
  for (const x of [-2.65, -1.75, -0.87, 0, 0.88, 1.75, 2.65]) {
    const door = box([0.78, 1.5, 0.055], materials.cabinetShell.clone(), { position: [x, 1.05, 0.86], name: `mau-service-door-${x}` });
    group.add(door);
    group.add(box([0.05, 0.28, 0.06], materials.darkMetal, { position: [x + 0.28, 1.02, 0.91], name: `mau-door-handle-${x}` }));
  }
  return group;
}

function createLouver(name, x, materials, color) {
  const group = new THREE.Group();
  group.name = name;
  group.position.x = x;
  const louverMaterial = standard(color, { roughness: 0.42, metalness: 0.45 });
  for (let index = 0; index < 9; index += 1) {
    group.add(box([0.08, 0.05, 1.35], louverMaterial, { position: [0, 0.52 + index * 0.13, 0], rotation: [0, 0, 0.22], name: `${name}-blade-${index + 1}` }));
  }
  group.add(box([0.08, 1.55, 0.08], materials.cabinetEdge, { position: [0, 1.05, -0.7], name: `${name}-frame-a` }));
  group.add(box([0.08, 1.55, 0.08], materials.cabinetEdge, { position: [0, 1.05, 0.7], name: `${name}-frame-b` }));
  return group;
}

function createFilter(name, x, filterMaterial, materials) {
  const group = new THREE.Group();
  group.name = name;
  group.position.x = x;
  group.add(box([0.09, 1.4, 1.42], filterMaterial, { position: [0, 1.05, 0], rotation: [0, 0, -0.12], name: `${name}-media` }));
  for (let y = 0.45; y <= 1.65; y += 0.16) group.add(box([0.1, 0.025, 1.44], materials.cabinetEdge, { position: [0, y, 0], rotation: [0, 0, -0.12], name: `${name}-pleat-${y}` }));
  return group;
}

function createCoil(materials, fluidPaths) {
  const group = new THREE.Group();
  group.name = "cooling-coil";
  const finMaterial = standard(0x4f93a9, { roughness: 0.28, metalness: 0.68 });
  for (let z = -0.62; z <= 0.62; z += 0.12) group.add(box([0.1, 1.38, 0.035], finMaterial, { position: [0, 1.06, z], rotation: [0, 0, -0.16], name: `cooling-fin-${z}` }));
  const chwsMaterial = standard(COLORS.chilledSupply, { roughness: 0.2, metalness: 0.58, emissive: COLORS.chilledSupply, emissiveIntensity: 0.18 });
  const chwrMaterial = standard(COLORS.chilledReturn, { roughness: 0.2, metalness: 0.58, emissive: COLORS.chilledReturn, emissiveIntensity: 0.14 });
  const supply = tube([[-0.25, 0.35, 0.62], [-0.25, 1.7, 0.62], [0.25, 1.7, -0.62], [0.25, 0.35, -0.62]], 0.045, chwsMaterial, { name: "mau-coil-chws", tubularSegments: 60 });
  group.add(supply);
  fluidPaths.push({ id: "mau-coil-chws", curve: supply.userData.curve, color: COLORS.chilledSupply, speed: 0.18 });
  const returnTube = tube([[0.34, 0.35, -0.62], [0.34, 1.7, -0.62], [-0.34, 1.7, 0.62], [-0.34, 0.35, 0.62]], 0.035, chwrMaterial, { name: "mau-coil-chwr", tubularSegments: 60 });
  group.add(returnTube);
  fluidPaths.push({ id: "mau-coil-chwr", curve: returnTube.userData.curve, color: COLORS.chilledReturn, speed: 0.15 });
  return group;
}

function createHeatingSection(materials) {
  const group = new THREE.Group();
  group.name = "heating-section";
  const heatMaterial = standard(0xcb5b45, { roughness: 0.3, metalness: 0.6, emissive: 0xff6547, emissiveIntensity: 0.12 });
  for (let index = 0; index < 9; index += 1) group.add(box([0.08, 1.35, 0.055], heatMaterial, { position: [0, 1.05, -0.58 + index * 0.145], rotation: [0, 0, 0.14], name: `heating-fin-${index + 1}` }));
  group.add(box([0.16, 0.26, 0.28], materials.cabinet, { position: [0, 1.62, 0.55], name: "heating-controller" }));
  return group;
}

function createHumidifier(materials) {
  const group = new THREE.Group();
  group.name = "humidifier";
  const header = cylinder(0.06, 1.25, materials.steel, { position: [0, 1.55, 0], rotation: [Math.PI / 2, 0, 0], segments: 16, name: "humidifier-header" });
  group.add(header);
  const droplets = [];
  const mistMaterial = emissive(0x8deeff, 0.8);
  for (let index = 0; index < 12; index += 1) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), mistMaterial);
    drop.position.set(0, 0.55 + ((index * 0.13) % 0.8), -0.52 + (index % 6) * 0.21);
    drop.name = `humidifier-drop-${index + 1}`;
    group.add(drop);
    droplets.push({ mesh: drop, baseY: drop.position.y, phase: index / 12, minY: 0.48, maxY: 1.48, speed: -0.18 });
  }
  group.userData.droplets = droplets;
  return group;
}

function createSupplyFan(materials) {
  const group = new THREE.Group();
  group.name = "supply-fan";
  const casing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 14, 52), materials.darkMetal);
  casing.name = "supply-fan-casing";
  casing.position.z = 0.34;
  group.add(casing);
  const rotor = new THREE.Group();
  rotor.name = "supply-fan-rotor";
  rotor.position.z = 0.38;
  rotor.add(cylinder(0.11, 0.2, materials.chrome, { rotation: [Math.PI / 2, 0, 0], segments: 24, name: "supply-fan-hub" }));
  for (let index = 0; index < 7; index += 1) rotor.add(box([0.38, 0.08, 0.06], materials.chrome, { position: [0.2, 0, 0], rotation: [0, 0, (index * Math.PI * 2) / 7 + 0.35], name: `supply-fan-blade-${index + 1}` }));
  group.add(rotor);
  group.add(box([0.32, 0.42, 0.5], materials.industrialBlue, { position: [0, -0.6, 0], name: "supply-fan-motor" }));
  return group;
}
