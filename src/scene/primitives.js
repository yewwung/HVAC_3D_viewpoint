import * as THREE from "three";

export function mesh(geometry, material, options = {}) {
  const object = new THREE.Mesh(geometry, material);
  object.name = options.name ?? "";
  object.position.fromArray(options.position ?? [0, 0, 0]);
  object.rotation.set(...(options.rotation ?? [0, 0, 0]));
  object.castShadow = options.castShadow ?? true;
  object.receiveShadow = options.receiveShadow ?? true;
  return object;
}

export function box(size, material, options = {}) {
  return mesh(new THREE.BoxGeometry(...size), material, options);
}

export function cylinder(radius, length, material, options = {}) {
  return mesh(
    new THREE.CylinderGeometry(options.radiusTop ?? radius, options.radiusBottom ?? radius, length, options.segments ?? 40, 1, options.openEnded ?? false),
    material,
    options,
  );
}

export function tube(points, radius, material, options = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "centripetal", 0.28);
  const object = mesh(
    new THREE.TubeGeometry(curve, options.tubularSegments ?? 72, radius, options.radialSegments ?? 14, false),
    material,
    { name: options.name, castShadow: options.castShadow, receiveShadow: options.receiveShadow },
  );
  object.userData.curve = curve;
  return object;
}

export function cylinderBetween(start, end, radius, material, options = {}) {
  const startVector = new THREE.Vector3(...start);
  const endVector = new THREE.Vector3(...end);
  const direction = endVector.clone().sub(startVector);
  const object = cylinder(radius, direction.length(), material, { ...options, segments: options.segments ?? 18 });
  object.position.copy(startVector).add(endVector).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return object;
}

export function createFlangeEnd({ radius, material, boltMaterial, name, side = 1, boltCount = 16 }) {
  const group = new THREE.Group();
  group.name = name;
  const plate = cylinder(radius * 1.08, 0.13, material, { rotation: [0, 0, Math.PI / 2], segments: 56, name: `${name}-plate` });
  group.add(plate);
  const cap = cylinder(radius * 0.92, 0.12, material, { position: [side * 0.105, 0, 0], rotation: [0, 0, Math.PI / 2], segments: 56, name: `${name}-cap` });
  group.add(cap);
  for (let index = 0; index < boltCount; index += 1) {
    const angle = (Math.PI * 2 * index) / boltCount;
    group.add(cylinder(radius * 0.045, 0.19, boltMaterial, {
      position: [side * 0.11, Math.cos(angle) * radius * 0.91, Math.sin(angle) * radius * 0.91],
      rotation: [0, 0, Math.PI / 2],
      segments: 10,
      name: `${name}-bolt-${index + 1}`,
    }));
  }
  return group;
}

export function createTubeBundle({ length, radius, tubeRadius, material, name, rows = 4, columns = 5 }) {
  const group = new THREE.Group();
  group.name = name;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const y = (row - (rows - 1) / 2) * radius * 0.34;
      const z = (column - (columns - 1) / 2) * radius * 0.28;
      if (Math.hypot(y, z) > radius * 0.78) continue;
      group.add(cylinder(tubeRadius, length, material, {
        position: [0, y, z],
        rotation: [0, 0, Math.PI / 2],
        segments: 10,
        name: `${name}-tube-${row}-${column}`,
      }));
    }
  }
  return group;
}

export function createGauge({ material, faceMaterial, needleMaterial, name }) {
  const group = new THREE.Group();
  group.name = name;
  group.add(cylinder(0.14, 0.06, material, { rotation: [Math.PI / 2, 0, 0], segments: 32, name: `${name}-case` }));
  group.add(cylinder(0.115, 0.064, faceMaterial, { position: [0, 0, 0.01], rotation: [Math.PI / 2, 0, 0], segments: 32, name: `${name}-face` }));
  const needle = box([0.012, 0.085, 0.01], needleMaterial, { position: [0.025, 0.025, 0.055], rotation: [0, 0, -0.55], name: `${name}-needle` });
  group.add(needle);
  return group;
}

export function createHelicalRotor({ length, radius, material, shaftMaterial, name, handedness = 1 }) {
  const group = new THREE.Group();
  group.name = name;
  group.add(cylinder(radius * 0.28, length, shaftMaterial, { rotation: [0, 0, Math.PI / 2], segments: 24, name: `${name}-shaft` }));
  for (let lobe = 0; lobe < 3; lobe += 1) {
    const points = [];
    const steps = 80;
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const angle = handedness * t * Math.PI * 5 + (lobe * Math.PI * 2) / 3;
      points.push([
        (t - 0.5) * length,
        Math.cos(angle) * radius * 0.62,
        Math.sin(angle) * radius * 0.62,
      ]);
    }
    const lobeMesh = tube(points, radius * 0.19, material, { name: `${name}-lobe-${lobe + 1}`, tubularSegments: 80, radialSegments: 8 });
    group.add(lobeMesh);
  }
  return group;
}

export function markEquipment(group, equipmentId) {
  group.userData.equipmentId = equipmentId;
  group.traverse((object) => {
    if (object.isMesh) object.userData.equipmentId = equipmentId;
  });
  return group;
}
