import * as THREE from "three";

import { COLORS, createMaterialLibrary, emissive, physical, standard } from "../materials.js";
import { box, cylinder, markEquipment, tube } from "../primitives.js";

export function buildPump(options = {}) {
  const id = options.id ?? "P-CHW-01";
  const color = options.color ?? COLORS.chilledSupply;
  const materials = createMaterialLibrary();
  const accent = standard(color, { roughness: 0.25, metalness: 0.58, emissive: color, emissiveIntensity: 0.04 });
  const shellAccent = physical(color, { roughness: 0.22, metalness: 0.55, transparent: true, opacity: 0.96 });
  const group = new THREE.Group();
  group.name = id;
  group.position.fromArray(options.position ?? [0, 0, 0]);
  const shells = [];
  const internals = [];
  const rotors = [];
  const fluidPaths = [];

  group.add(box([2.25, 0.14, 1.0], materials.darkMetal, { position: [0.15, 0.08, 0], name: "pump-skid" }));
  group.add(box([2.0, 0.11, 0.82], materials.rubber, { position: [0.15, -0.01, 0], name: "pump-isolation-base" }));

  const volute = cylinder(0.47, 0.4, shellAccent, { position: [-0.62, 0.62, 0], rotation: [Math.PI / 2, 0, 0], segments: 56, name: "volute-shell" });
  group.add(volute);
  shells.push(volute);
  const voluteRing = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.075, 14, 52), accent);
  voluteRing.name = "volute-ring";
  voluteRing.position.set(-0.62, 0.62, 0.22);
  group.add(voluteRing);
  shells.push(voluteRing);

  const impeller = new THREE.Group();
  impeller.name = "pump-impeller";
  impeller.position.set(-0.62, 0.62, 0.02);
  impeller.add(cylinder(0.11, 0.17, materials.brass, { rotation: [Math.PI / 2, 0, 0], segments: 24, name: "impeller-hub" }));
  for (let index = 0; index < 7; index += 1) {
    const blade = box([0.27, 0.065, 0.11], materials.brass, {
      position: [Math.cos((index * Math.PI * 2) / 7) * 0.18, Math.sin((index * Math.PI * 2) / 7) * 0.18, 0],
      rotation: [0, 0, (index * Math.PI * 2) / 7 + 0.45],
      name: `impeller-blade-${index + 1}`,
    });
    impeller.add(blade);
  }
  group.add(impeller);
  internals.push(impeller);
  rotors.push(impeller);

  const suction = cylinder(0.22, 0.55, accent, { position: [-1.05, 0.62, 0], rotation: [0, 0, Math.PI / 2], segments: 36, name: "pump-suction" });
  group.add(suction);
  shells.push(suction);
  const discharge = cylinder(0.2, 0.65, accent, { position: [-0.62, 1.05, 0], segments: 36, name: "pump-discharge" });
  group.add(discharge);
  shells.push(discharge);

  const motor = cylinder(0.38, 1.2, materials.industrialBlue, { position: [0.56, 0.64, 0], rotation: [0, 0, Math.PI / 2], segments: 48, name: "pump-motor-shell" });
  group.add(motor);
  shells.push(motor);
  for (const x of [0.05, 0.22, 0.39, 0.56, 0.73, 0.9, 1.07]) {
    const fin = cylinder(0.41, 0.045, materials.darkBlue, { position: [x, 0.64, 0], rotation: [0, 0, Math.PI / 2], segments: 40, name: `motor-cooling-fin-${x}` });
    group.add(fin);
    shells.push(fin);
  }
  const rotor = cylinder(0.1, 1.45, materials.chrome, { position: [-0.02, 0.62, 0], rotation: [0, 0, Math.PI / 2], segments: 24, name: "motor-rotor" });
  group.add(rotor);
  internals.push(rotor);
  rotors.push(rotor);
  group.add(cylinder(0.18, 0.25, materials.brass, { position: [-0.08, 0.62, 0], rotation: [0, 0, Math.PI / 2], segments: 24, name: "pump-coupling" }));

  const terminalBox = box([0.52, 0.3, 0.45], materials.cabinet, { position: [0.55, 1.06, 0], name: "pump-terminal-box" });
  group.add(terminalBox);
  shells.push(terminalBox);
  const status = cylinder(0.04, 0.025, emissive(options.running === false ? 0xff5c47 : 0x4ce09a), { position: [0.55, 1.12, 0.24], rotation: [Math.PI / 2, 0, 0], segments: 16, name: "pump-status-light" });
  group.add(status);
  internals.push(status);

  const internalFlow = tube(
    [[-1.45, 0.62, 0], [-0.92, 0.62, 0], [-0.62, 0.62, 0], [-0.62, 0.88, 0], [-0.62, 1.34, 0]],
    0.07,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, toneMapped: false }),
    { name: "pump-internal-flow", tubularSegments: 48, radialSegments: 10 },
  );
  group.add(internalFlow);
  internals.push(internalFlow);
  fluidPaths.push({ id: `${id}-internal-flow`, curve: internalFlow.userData.curve, color, speed: 0.22 });

  group.userData.shells = shells;
  group.userData.internals = internals;
  group.userData.animation = { rotors, fluidPaths };
  group.userData.focusPoint = new THREE.Vector3(0, 0.72, 0);
  group.userData.focusDistance = 4.2;
  markEquipment(group, id);
  return group;
}
