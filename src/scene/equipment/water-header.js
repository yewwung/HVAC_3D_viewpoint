import * as THREE from "three";

import { createMaterialLibrary, emissive, physical, standard } from "../materials.js";
import { box, createGauge, cylinder, markEquipment, tube } from "../primitives.js";

export function buildWaterHeader(options = {}) {
  const id = options.id ?? "HEADER-CHWS";
  const color = options.color ?? 0x27b7ff;
  const materials = createMaterialLibrary();
  const group = new THREE.Group();
  group.name = id;
  group.position.fromArray(options.position ?? [0, 0, 0]);
  const shellMaterial = physical(color, { roughness: 0.22, metalness: 0.58, transparent: true, opacity: 0.96 });
  const accent = standard(color, { roughness: 0.2, metalness: 0.58, emissive: color, emissiveIntensity: 0.08 });
  const shells = [];
  const internals = [];

  group.add(box([4.25, 0.1, 0.86], materials.darkMetal, { position: [0, 0.08, 0], name: `${id}-base` }));
  const vessel = cylinder(0.38, 3.85, shellMaterial, { position: [0, 0.72, 0], rotation: [0, 0, Math.PI / 2], segments: 56, name: `${id}-shell` });
  group.add(vessel);
  shells.push(vessel);
  for (const x of [-1.95, 1.95]) {
    const cap = cylinder(0.42, 0.15, accent, { position: [x, 0.72, 0], rotation: [0, 0, Math.PI / 2], segments: 48, name: `${id}-end-${x}` });
    group.add(cap);
    shells.push(cap);
  }
  for (const x of [-1.25, 0, 1.25]) {
    const branch = cylinder(0.13, 0.75, accent, { position: [x, 1.25, 0], segments: 28, name: `${id}-branch-${x}` });
    group.add(branch);
    internals.push(branch);
    group.add(cylinder(0.19, 0.08, materials.chrome, { position: [x, 1.65, 0], segments: 28, name: `${id}-branch-flange-${x}` }));
  }
  for (const x of [-1.45, 1.45]) group.add(box([0.18, 0.42, 0.54], materials.darkMetal, { position: [x, 0.32, 0], name: `${id}-saddle-${x}` }));
  const internalFlow = tube([[-1.82, 0.72, 0], [0, 0.72, 0], [1.82, 0.72, 0]], 0.1, emissive(color), { name: `${id}-internal-flow`, tubularSegments: 40 });
  group.add(internalFlow);
  internals.push(internalFlow);
  const gauge = createGauge({ material: materials.chrome, faceMaterial: materials.whiteGlow, needleMaterial: emissive(color), name: `${id}-pressure-gauge` });
  gauge.position.set(1.55, 1.25, 0.33);
  group.add(gauge);
  internals.push(gauge);

  group.userData.shells = shells;
  group.userData.internals = internals;
  group.userData.animation = { rotors: [], fluidPaths: [{ id: `${id}-flow`, curve: internalFlow.userData.curve, color, speed: 0.15 }] };
  group.userData.focusPoint = new THREE.Vector3(0, 0.8, 0);
  group.userData.focusDistance = 5.6;
  markEquipment(group, id);
  return group;
}
