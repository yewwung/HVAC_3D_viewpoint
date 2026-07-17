import * as THREE from "three";

import { COLORS, createMaterialLibrary, emissive, standard } from "../materials.js";
import {
  box,
  createFlangeEnd,
  createGauge,
  createHelicalRotor,
  createTubeBundle,
  cylinder,
  cylinderBetween,
  markEquipment,
  tube,
} from "../primitives.js";

export function buildScrewChiller(options = {}) {
  const materials = createMaterialLibrary();
  const group = new THREE.Group();
  group.name = options.id ?? "CH-01";
  group.position.fromArray(options.position ?? [0, 0, 0]);
  const shells = [];
  const internals = [];
  const fluidPaths = [];
  const rotors = [];

  const add = (object, category = null) => {
    group.add(object);
    if (category === "shell") shells.push(object);
    if (category === "internal") internals.push(object);
    return object;
  };

  createSkid(group, materials);
  createShellAndTubeExchanger({
    group,
    materials,
    add,
    name: "evaporator",
    position: [0, 0.75, 0.53],
    radius: 0.62,
    length: 5.35,
    shellMaterial: materials.industrialBlueShell,
    bundleMaterial: materials.copper,
  });
  createShellAndTubeExchanger({
    group,
    materials,
    add,
    name: "condenser",
    position: [0.08, 0.67, -0.58],
    radius: 0.54,
    length: 5.05,
    shellMaterial: materials.industrialBlueShell.clone(),
    bundleMaterial: materials.brass,
  });

  const compressor = createCompressor(materials, rotors, internals, shells);
  compressor.position.set(1.45, 1.92, -0.28);
  add(compressor);

  const cabinet = createControlCabinet(materials, shells, internals);
  cabinet.position.set(-0.75, 2.13, 0.18);
  add(cabinet);

  const refrigerantLoop = createRefrigerantLoop(materials, fluidPaths, internals);
  add(refrigerantLoop);

  const gaugeHigh = createGauge({ material: materials.chrome, faceMaterial: materials.whiteGlow, needleMaterial: emissive(0xff6547), name: "high-pressure-gauge" });
  gaugeHigh.position.set(-2.34, 2.18, 0.58);
  add(gaugeHigh, "internal");
  const gaugeLow = createGauge({ material: materials.chrome, faceMaterial: materials.whiteGlow, needleMaterial: emissive(0x27b7ff), name: "low-pressure-gauge" });
  gaugeLow.position.set(-2.34, 1.83, 0.58);
  add(gaugeLow, "internal");

  const brassBypass = tube(
    [[0.65, 0.72, 1.14], [1.35, 0.72, 1.14], [1.7, 0.96, 1.04], [2.15, 0.96, 0.7]],
    0.045,
    materials.brass,
    { name: "brass-bypass-line", tubularSegments: 50, radialSegments: 10 },
  );
  add(brassBypass, "internal");
  const bypassValve = cylinder(0.105, 0.16, materials.brass, { position: [1.5, 0.85, 1.1], rotation: [0, 0, Math.PI / 2], name: "bypass-valve", segments: 20 });
  add(bypassValve, "internal");

  const nameplate = box([0.62, 0.24, 0.035], materials.chrome, { position: [1.45, 1.06, 1.12], rotation: [-0.18, 0, 0], name: "equipment-nameplate" });
  add(nameplate, "internal");
  const nameplateMark = box([0.42, 0.045, 0.006], emissive(0x1b4465), { position: [1.45, 1.075, 1.142], rotation: [-0.18, 0, 0], name: "equipment-nameplate-mark" });
  add(nameplateMark, "internal");

  group.userData.shells = shells;
  group.userData.internals = internals;
  group.userData.animation = { rotors, fluidPaths };
  group.userData.focusPoint = new THREE.Vector3(0, 1.15, 0);
  group.userData.focusDistance = 8.2;
  markEquipment(group, group.name);
  return group;
}

function createSkid(group, materials) {
  for (const z of [-0.78, 0.78]) {
    group.add(box([5.8, 0.14, 0.18], materials.darkMetal, { position: [0, 0.08, z], name: `skid-rail-${z}` }));
  }
  for (const x of [-2.35, -0.8, 0.8, 2.35]) {
    group.add(box([0.28, 0.24, 1.78], materials.darkMetal, { position: [x, 0.22, 0], name: `skid-crossmember-${x}` }));
    for (const z of [-0.7, 0.7]) {
      group.add(box([0.48, 0.08, 0.42], materials.rubber, { position: [x, -0.03, z], name: `isolation-pad-${x}-${z}` }));
    }
  }
  for (const x of [-1.8, 1.8]) {
    for (const z of [-0.52, 0.52]) {
      group.add(box([0.18, 0.6, 0.16], materials.industrialBlue, { position: [x, 0.42, z], rotation: [0, 0, x < 0 ? -0.35 : 0.35], name: `saddle-${x}-${z}` }));
    }
  }
}

function createShellAndTubeExchanger({ group, materials, add, name, position, radius, length, shellMaterial, bundleMaterial }) {
  const shell = cylinder(radius, length, shellMaterial, {
    position,
    rotation: [0, 0, Math.PI / 2],
    segments: 64,
    name: `${name}-shell`,
  });
  add(shell, "shell");

  const bundle = createTubeBundle({ length: length - 0.34, radius, tubeRadius: 0.022, material: bundleMaterial, name: `${name}-tube-bundle`, rows: 6, columns: 7 });
  bundle.position.fromArray(position);
  add(bundle, "internal");

  const frontFlange = createFlangeEnd({ radius, material: materials.industrialBlue, boltMaterial: materials.chrome, name: `${name}-front-flange`, side: -1, boltCount: 18 });
  frontFlange.position.set(position[0] - length / 2 - 0.09, position[1], position[2]);
  add(frontFlange, "shell");
  const rearFlange = createFlangeEnd({ radius, material: materials.industrialBlue, boltMaterial: materials.chrome, name: `${name}-rear-flange`, side: 1, boltCount: 18 });
  rearFlange.position.set(position[0] + length / 2 + 0.09, position[1], position[2]);
  add(rearFlange, "shell");

  for (const x of [-1.65, 0, 1.65]) {
    const band = cylinder(radius * 1.035, 0.055, materials.darkBlue, { position: [x + position[0], position[1], position[2]], rotation: [0, 0, Math.PI / 2], segments: 56, name: `${name}-band-${x}` });
    add(band, "shell");
  }

  const nozzleColor = name === "evaporator" ? COLORS.chilledSupply : COLORS.coolingSupply;
  const nozzleMaterial = standard(nozzleColor, { roughness: 0.24, metalness: 0.58 });
  for (const offset of [-1.45, 1.45]) {
    const nozzle = cylinder(radius * 0.23, 0.5, nozzleMaterial, {
      position: [position[0] + offset, position[1] + radius + 0.22, position[2]],
      segments: 30,
      name: `${name}-water-nozzle-${offset}`,
    });
    add(nozzle, "internal");
    const flange = cylinder(radius * 0.32, 0.08, materials.chrome, {
      position: [position[0] + offset, position[1] + radius + 0.5, position[2]],
      segments: 30,
      name: `${name}-water-nozzle-flange-${offset}`,
    });
    add(flange, "internal");
  }
  const drain = cylinderBetween(
    [position[0] + 2.0, position[1] - radius, position[2]],
    [position[0] + 2.0, position[1] - radius - 0.28, position[2] + 0.2],
    0.045,
    materials.brass,
    { name: `${name}-drain` },
  );
  add(drain, "internal");
}

function createCompressor(materials, rotors, internals, shells) {
  const group = new THREE.Group();
  group.name = "compressor";
  const casing = cylinder(0.5, 2.15, materials.industrialBlueShell.clone(), { rotation: [0, 0, Math.PI / 2], segments: 56, name: "compressor-shell" });
  group.add(casing);
  shells.push(casing);
  const motor = cylinder(0.46, 0.78, materials.darkBlue, { position: [-1.42, 0, 0], rotation: [0, 0, Math.PI / 2], segments: 50, name: "compressor-motor" });
  group.add(motor);
  shells.push(motor);
  for (const x of [-1.78, -1.62, -1.46, -1.3, -1.14]) {
    const fin = cylinder(0.5, 0.04, materials.darkMetal, { position: [x, 0, 0], rotation: [0, 0, Math.PI / 2], segments: 48, name: `compressor-motor-fin-${x}` });
    group.add(fin);
    shells.push(fin);
  }

  const rotorA = createHelicalRotor({ length: 1.65, radius: 0.22, material: standard(0xc8d3d5, { roughness: 0.18, metalness: 0.9 }), shaftMaterial: materials.darkMetal, name: "screw-rotor-a", handedness: 1 });
  rotorA.position.set(0.2, 0.17, 0);
  group.add(rotorA);
  rotors.push(rotorA);
  internals.push(rotorA);
  const rotorB = createHelicalRotor({ length: 1.65, radius: 0.22, material: standard(0x92a9ac, { roughness: 0.2, metalness: 0.88 }), shaftMaterial: materials.darkMetal, name: "screw-rotor-b", handedness: -1 });
  rotorB.position.set(0.2, -0.17, 0);
  group.add(rotorB);
  rotors.push(rotorB);
  internals.push(rotorB);

  const terminalBox = box([0.62, 0.46, 0.5], materials.cabinet, { position: [-1.25, 0.46, 0], name: "compressor-terminal-box" });
  group.add(terminalBox);
  shells.push(terminalBox);
  return group;
}

function createControlCabinet(materials, shells, internals) {
  const group = new THREE.Group();
  group.name = "control-cabinet";
  const body = box([2.95, 1.34, 0.72], materials.cabinetShell.clone(), { name: "control-cabinet-shell" });
  group.add(body);
  shells.push(body);
  for (const x of [-0.73, 0.73]) {
    const door = box([1.4, 1.22, 0.045], materials.cabinet, { position: [x, 0, 0.39], name: `control-cabinet-door-${x}` });
    group.add(door);
    shells.push(door);
    const handle = box([0.07, 0.34, 0.07], materials.darkMetal, { position: [x + (x < 0 ? 0.52 : -0.52), -0.05, 0.45], name: `control-cabinet-handle-${x}` });
    group.add(handle);
    internals.push(handle);
  }
  const screen = box([0.56, 0.3, 0.04], materials.screen, { position: [-0.7, 0.22, 0.43], name: "control-screen" });
  group.add(screen);
  internals.push(screen);
  const screenLine = box([0.38, 0.025, 0.015], emissive(0x6de7ff), { position: [-0.7, 0.24, 0.458], name: "control-screen-line" });
  group.add(screenLine);
  internals.push(screenLine);
  const indicatorColors = [0x36d17d, 0xffc04c, 0x36d17d, 0xff624a];
  indicatorColors.forEach((color, index) => {
    const lamp = cylinder(0.035, 0.025, emissive(color), { position: [0.18 + index * 0.18, 0.34, 0.44], rotation: [Math.PI / 2, 0, 0], segments: 18, name: `cabinet-indicator-${index + 1}` });
    group.add(lamp);
    internals.push(lamp);
  });
  const panelMark = box([0.48, 0.22, 0.035], standard(0xb72724, { roughness: 0.35, metalness: 0.2 }), { position: [0.82, 0.32, 0.43], name: "manufacturer-panel" });
  group.add(panelMark);
  internals.push(panelMark);
  return group;
}

function createRefrigerantLoop(materials, fluidPaths, internals) {
  const group = new THREE.Group();
  group.name = "refrigerant-loop";
  const segments = [
    {
      name: "hot-gas-line",
      color: COLORS.refrigerantHot,
      points: [[2.15, 2.1, -0.28], [2.75, 2.1, -0.28], [2.95, 1.68, -0.5], [2.45, 1.15, -0.58]],
    },
    {
      name: "liquid-line",
      color: COLORS.refrigerantLiquid,
      points: [[2.15, 1.05, -0.58], [1.45, 1.25, -0.82], [0.75, 1.35, -0.72], [0.3, 1.22, -0.2]],
    },
    {
      name: "expansion-line",
      color: COLORS.refrigerantExpansion,
      points: [[0.3, 1.22, -0.2], [0.2, 1.36, 0.25], [0.5, 1.35, 0.52]],
    },
    {
      name: "suction-line",
      color: COLORS.refrigerantCold,
      points: [[0.5, 1.35, 0.52], [0.65, 1.82, 0.58], [0.8, 2.25, 0.25], [0.4, 2.18, -0.28]],
    },
  ];

  for (const segment of segments) {
    const segmentMaterial = standard(segment.color, { roughness: 0.2, metalness: 0.56, emissive: segment.color, emissiveIntensity: 0.22 });
    const object = tube(segment.points, 0.095, segmentMaterial, { name: segment.name, tubularSegments: 64, radialSegments: 16 });
    group.add(object);
    internals.push(object);
    fluidPaths.push({ id: segment.name, curve: object.userData.curve, color: segment.color, speed: 0.08 });
  }
  const expansionValve = cylinder(0.16, 0.24, materials.brass, { position: [0.27, 1.33, 0.08], rotation: [0, 0, Math.PI / 2], segments: 24, name: "expansion-valve" });
  group.add(expansionValve);
  internals.push(expansionValve);
  const actuator = box([0.22, 0.2, 0.2], materials.cabinet, { position: [0.27, 1.58, 0.08], name: "expansion-valve-actuator" });
  group.add(actuator);
  internals.push(actuator);
  return group;
}
