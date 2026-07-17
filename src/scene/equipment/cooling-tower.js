import * as THREE from "three";

import { COLORS, createMaterialLibrary, emissive, physical, standard } from "../materials.js";
import { box, cylinder, cylinderBetween, markEquipment, tube } from "../primitives.js";

export function buildCoolingTower(options = {}) {
  const id = options.id ?? "CT-01";
  const materials = createMaterialLibrary();
  const group = new THREE.Group();
  group.name = id;
  group.position.fromArray(options.position ?? [0, 0, 0]);
  const shells = [];
  const internals = [];
  const rotors = [];
  const droplets = [];
  const airflow = [];
  const xrayLayers = new THREE.Group();
  xrayLayers.name = "tower-xray-layers";
  xrayLayers.userData.xrayOnly = true;
  xrayLayers.visible = false;
  group.add(xrayLayers);
  internals.push(xrayLayers);

  const basin = box([2.65, 0.32, 1.65], materials.darkMetal, { position: [0, 0.28, 0], name: "collection-basin" });
  group.add(basin);
  shells.push(basin);

  const basinWaterMaterial = new THREE.MeshBasicMaterial({ color: COLORS.coolingSupply, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false });
  const basinWater = box([2.36, 0.12, 1.38], basinWaterMaterial, {
    position: [0, 0.43, 0],
    name: "basin-water",
    castShadow: false,
    receiveShadow: false,
  });
  basinWater.renderOrder = 4;
  xrayLayers.add(basinWater);

  const shellGroup = new THREE.Group();
  shellGroup.name = "tower-shell";
  const shellMaterial = physical(0xcbd4d3, { roughness: 0.35, metalness: 0.44, transparent: true, opacity: 0.95 });
  for (const x of [-1.25, 1.25]) shellGroup.add(box([0.12, 1.75, 1.55], shellMaterial, { position: [x, 1.28, 0], name: `tower-side-${x}` }));
  for (const z of [-0.76, 0.76]) shellGroup.add(box([2.5, 0.11, 0.08], materials.cabinetEdge, { position: [0, 2.13, z], name: `tower-top-rail-${z}` }));
  for (const x of [-1.05, 1.05]) {
    for (const z of [-0.76, 0.76]) shellGroup.add(box([0.09, 1.78, 0.09], materials.cabinetEdge, { position: [x, 1.28, z], name: `tower-post-${x}-${z}` }));
  }
  const louverMaterial = standard(0x33484a, { roughness: 0.45, metalness: 0.35 });
  for (const z of [-0.8, 0.8]) {
    for (let index = 0; index < 9; index += 1) {
      shellGroup.add(box([2.0, 0.055, 0.055], louverMaterial, { position: [0, 0.72 + index * 0.12, z], rotation: [z > 0 ? 0.18 : -0.18, 0, 0], name: `tower-louver-${z}-${index}` }));
    }
  }
  group.add(shellGroup);
  shells.push(shellGroup);

  const fillMedia = new THREE.Group();
  fillMedia.name = "fill-media";
  const fillMaterial = standard(0x719a95, { roughness: 0.42, metalness: 0.12, transparent: true, opacity: 0.68 });
  for (let x = -0.9; x <= 0.9; x += 0.18) {
    for (const z of [-0.42, 0.42]) fillMedia.add(box([0.035, 0.92, 0.62], fillMaterial, { position: [x, 1.12, z], rotation: [0, z > 0 ? 0.16 : -0.16, 0], name: `fill-sheet-${x}-${z}` }));
  }
  group.add(fillMedia);
  internals.push(fillMedia);

  const spraySystem = new THREE.Group();
  spraySystem.name = "spray-system";
  const hotWaterMaterial = standard(COLORS.coolingReturn, { roughness: 0.22, metalness: 0.56, emissive: COLORS.coolingReturn, emissiveIntensity: 0.12 });
  spraySystem.add(tube([[-1.18, 1.9, 0], [0, 1.9, 0], [1.18, 1.9, 0]], 0.075, hotWaterMaterial, { name: "spray-header" }));
  for (const x of [-0.82, -0.4, 0, 0.4, 0.82]) {
    spraySystem.add(cylinder(0.035, 1.05, hotWaterMaterial, { position: [x, 1.88, 0], rotation: [Math.PI / 2, 0, 0], segments: 12, name: `spray-branch-${x}` }));
    for (const z of [-0.42, 0, 0.42]) spraySystem.add(cylinder(0.045, 0.13, materials.brass, { position: [x, 1.78, z], name: `spray-nozzle-${x}-${z}` }));
  }
  group.add(spraySystem);
  internals.push(spraySystem);

  const sprayCones = new THREE.Group();
  sprayCones.name = "spray-cones";
  const sprayConeMaterial = new THREE.MeshBasicMaterial({ color: 0x4bdcff, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  for (const x of [-0.82, -0.4, 0, 0.4, 0.82]) {
    for (const z of [-0.42, 0, 0.42]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.38, 16, 1, true), sprayConeMaterial);
      cone.name = `spray-cone-${x}-${z}`;
      cone.position.set(x, 1.58, z);
      cone.rotation.z = Math.PI;
      sprayCones.add(cone);
    }
  }
  xrayLayers.add(sprayCones);

  const eliminator = new THREE.Group();
  eliminator.name = "drift-eliminator";
  const eliminatorMaterial = standard(0xb8ccca, { roughness: 0.34, metalness: 0.35, transparent: true, opacity: 0.72 });
  for (let z = -0.52; z <= 0.52; z += 0.15) {
    eliminator.add(box([2.05, 0.045, 0.08], eliminatorMaterial, {
      position: [0, 1.76, z],
      rotation: [0.18, 0, 0],
      name: `eliminator-blade-${z}`,
    }));
  }
  xrayLayers.add(eliminator);

  const plenumMaterial = new THREE.MeshBasicMaterial({ color: 0x71f1df, transparent: true, opacity: 0.07, depthWrite: false, toneMapped: false, side: THREE.BackSide });
  const airPlenum = box([2.08, 1.22, 1.18], plenumMaterial, {
    position: [0, 1.2, 0],
    name: "tower-air-plenum",
    castShadow: false,
    receiveShadow: false,
  });
  airPlenum.renderOrder = 2;
  xrayLayers.add(airPlenum);

  const fanStack = cylinder(0.53, 0.34, materials.darkMetal, { position: [0, 2.32, 0], segments: 56, name: "fan-stack" });
  group.add(fanStack);
  shells.push(fanStack);
  const fanRotor = new THREE.Group();
  fanRotor.name = "fan-rotor";
  fanRotor.position.set(0, 2.51, 0);
  fanRotor.add(cylinder(0.1, 0.15, materials.chrome, { name: "fan-hub", segments: 24 }));
  for (let index = 0; index < 6; index += 1) {
    const blade = box([0.62, 0.045, 0.16], materials.chrome, { position: [0.29, 0, 0], rotation: [0, (index * Math.PI * 2) / 6 + 0.2, 0], name: `fan-blade-${index + 1}` });
    fanRotor.add(blade);
  }
  group.add(fanRotor);
  internals.push(fanRotor);
  rotors.push(fanRotor);

  const waterGroup = new THREE.Group();
  waterGroup.name = "falling-water";
  const waterMaterial = emissive(COLORS.coolingSupply, 0.8);
  for (let index = 0; index < 56; index += 1) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), waterMaterial);
    const x = -0.95 + ((index * 0.37) % 1.9);
    const z = -0.55 + ((index * 0.29) % 1.1);
    drop.position.set(x, 0.58 + ((index * 0.19) % 1.15), z);
    drop.scale.y = 2.2;
    drop.name = `tower-water-drop-${index + 1}`;
    waterGroup.add(drop);
    droplets.push({ mesh: drop, baseY: drop.position.y, phase: index / 56, minY: 0.48, maxY: 1.78, speed: 0.22 + (index % 4) * 0.018 });
  }
  group.add(waterGroup);
  internals.push(waterGroup);

  const airGroup = new THREE.Group();
  airGroup.name = "rising-air";
  const airMaterial = new THREE.MeshBasicMaterial({ color: 0x9af4e9, transparent: true, opacity: 0.48, toneMapped: false, depthWrite: false });
  for (let index = 0; index < 24; index += 1) {
    const mote = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.13, 4, 8), airMaterial);
    mote.position.set(-0.75 + ((index * 0.41) % 1.5), 0.62 + ((index * 0.27) % 1.7), -0.35 + ((index * 0.33) % 0.7));
    mote.name = `tower-air-mote-${index + 1}`;
    airGroup.add(mote);
    airflow.push({ mesh: mote, phase: index / 24, minY: 0.58, maxY: 2.72, speed: 0.1 + (index % 3) * 0.012 });
  }
  group.add(airGroup);
  internals.push(airGroup);

  for (const x of [-0.9, 0.9]) {
    group.add(cylinderBetween([x, 0.08, -0.62], [x, 2.12, 0.62], 0.025, materials.cabinetEdge, { name: `tower-brace-a-${x}` }));
    group.add(cylinderBetween([x, 0.08, 0.62], [x, 2.12, -0.62], 0.025, materials.cabinetEdge, { name: `tower-brace-b-${x}` }));
  }

  group.userData.shells = shells;
  group.userData.internals = internals;
  group.userData.animation = { rotors, droplets, airflow, fluidPaths: [] };
  group.userData.focusPoint = new THREE.Vector3(0, 1.35, 0);
  group.userData.focusDistance = 5.5;
  markEquipment(group, id);
  return group;
}
