import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const canvas = document.querySelector("#scene-canvas");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe6ee);
scene.fog = new THREE.Fog(0xdfe6ee, 34, 70);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
camera.position.set(11, 8, 13);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 7;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.48;
controls.target.set(1.4, 1.1, -0.6);

const clock = new THREE.Clock();
const flowParticles = [];
const flowArrows = [];
const pumpRotors = [];
const sceneLabels = [];

const palette = {
  steel: 0x9aa6b2,
  darkSteel: 0x4b5563,
  floor: 0xc9d2dc,
  wall: 0xe8edf3,
  chiller: 0xe6eef7,
  chillerTrim: 0x315b8a,
  chws: 0x1677ff,
  chwr: 0x274472,
  cws: 0x00a99d,
  cwr: 0xf28c28,
  label: 0x172033,
};

const chillerPorts = {
  chwrIn: [-4.56, 0.68, 0.18],
  chwsOut: [-4.56, 0.28, 0.18],
  cwsIn: [-4.56, 0.31, -0.28],
  cwrOut: [-4.56, 0.57, -0.28],
};

const materials = {
  floor: new THREE.MeshStandardMaterial({ color: palette.floor, roughness: 0.72, metalness: 0.08 }),
  wall: new THREE.MeshStandardMaterial({ color: palette.wall, roughness: 0.86, metalness: 0.02 }),
  steel: new THREE.MeshStandardMaterial({ color: palette.steel, roughness: 0.45, metalness: 0.42 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: palette.darkSteel, roughness: 0.4, metalness: 0.52 }),
  chiller: new THREE.MeshStandardMaterial({ color: palette.chiller, roughness: 0.55, metalness: 0.18 }),
  concretePad: new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.78, metalness: 0.02 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.62, metalness: 0.08 }),
  grille: new THREE.MeshStandardMaterial({ color: 0x6f7d8c, roughness: 0.48, metalness: 0.36 }),
  blueGlass: new THREE.MeshPhysicalMaterial({
    color: 0x8cc7ff,
    roughness: 0.18,
    metalness: 0.08,
    transmission: 0.18,
    transparent: true,
    opacity: 0.74,
  }),
  warning: new THREE.MeshStandardMaterial({ color: 0xf5b041, roughness: 0.48, metalness: 0.18 }),
};

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.4,
    metalness: options.metalness ?? 0.18,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

function roundedBox(width, height, depth, radius, smoothness) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: smoothness,
    steps: 1,
    bevelSize: radius * 0.5,
    bevelThickness: radius * 0.5,
  }).center();
}

function addMesh(geometry, material, position, rotation = [0, 0, 0], cast = true, receive = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  scene.add(mesh);
  return mesh;
}

function makeTextSprite(text, color = "#172033", bg = "rgba(255,255,255,0.86)", width = 440) {
  const canvasLabel = document.createElement("canvas");
  const ctx = canvasLabel.getContext("2d");
  const lines = text.split("\n");
  const fontSize = 34;
  const padding = 22;
  canvasLabel.width = width;
  canvasLabel.height = lines.length * (fontSize + 9) + padding * 2;
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, canvasLabel.width, canvasLabel.height, 18);
  ctx.fill();
  ctx.font = `700 ${fontSize}px "Microsoft YaHei", "Segoe UI", Arial`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  lines.forEach((line, index) => ctx.fillText(line, padding, padding + index * (fontSize + 9)));

  const texture = new THREE.CanvasTexture(canvasLabel);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sprite.scale.set(canvasLabel.width / 120, canvasLabel.height / 120, 1);
  sprite.userData.baseScale = sprite.scale.clone();
  sprite.renderOrder = 10;
  return sprite;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function label(text, position, color, bg, width) {
  const sprite = makeTextSprite(text, color, bg, width);
  sprite.position.set(...position);
  scene.add(sprite);
  sceneLabels.push(sprite);
  return sprite;
}

function createGlowTexture() {
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const ctx = glowCanvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.28, "rgba(255,255,255,0.42)");
  gradient.addColorStop(0.66, "rgba(255,255,255,0.12)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(glowCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const flowGlowTexture = createGlowTexture();

function orthogonalPoints(points) {
  const route = [];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  points.forEach((point, index) => {
    if (index === 0) {
      route.push(point);
      return;
    }
    const last = route[route.length - 1];
    const pivots = [
      [point[0], last[1], last[2]],
      [point[0], point[1], last[2]],
      point,
    ];
    pivots.forEach((pivot) => {
      if (!same(route[route.length - 1], pivot)) route.push(pivot);
    });
  });
  return route;
}

function makePipePath(points) {
  const path = new THREE.CurvePath();
  const vectors = points.map((p) => new THREE.Vector3(...p));
  vectors.forEach((point, index) => {
    if (index === 0) return;
    if (!point.equals(vectors[index - 1])) {
      path.add(new THREE.LineCurve3(vectors[index - 1], point));
    }
  });
  return path;
}

function pipe(name, points, color, radius = 0.105, speed = 0.1) {
  const routePoints = orthogonalPoints(points);
  const curve = makePipePath(routePoints);
  const pipeGroup = new THREE.Group();
  pipeGroup.name = name;
  const length = curve.getLength();

  const hazeGeometry = new THREE.TubeGeometry(curve, 128, radius * 2.75, 30, false);
  const haze = new THREE.Mesh(
    hazeGeometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.052,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  haze.castShadow = false;
  haze.renderOrder = 1;
  pipeGroup.add(haze);

  const outerGeometry = new THREE.TubeGeometry(curve, 128, radius * 1.18, 28, false);
  const outer = new THREE.Mesh(
    outerGeometry,
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.12,
      metalness: 0.12,
      transparent: true,
      opacity: 0.14,
      transmission: 0.34,
      depthWrite: false,
    }),
  );
  outer.castShadow = false;
  outer.receiveShadow = true;
  outer.renderOrder = 2;
  pipeGroup.add(outer);

  const coreGeometry = new THREE.TubeGeometry(curve, 128, radius * 0.36, 16, false);
  const core = new THREE.Mesh(
    coreGeometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  core.renderOrder = 3;
  pipeGroup.add(core);

  routePoints.slice(1, -1).forEach((point) => {
    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.28, 18, 12),
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.22,
        metalness: 0.18,
        transparent: true,
        opacity: 0.18,
        transmission: 0.18,
        depthWrite: false,
      }),
    );
    elbow.position.set(...point);
    elbow.castShadow = false;
    elbow.renderOrder = 3;
    pipeGroup.add(elbow);
  });

  const arrowSteps = length > 6 ? [0.22, 0.5, 0.78] : [0.45, 0.78];
  arrowSteps.forEach((t, index) => {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 1.75, radius * 4.1, 22),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const tangent = curve.getTangentAt(t).normalize();
    arrow.position.copy(curve.getPointAt(t));
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    arrow.renderOrder = 5;
    pipeGroup.add(arrow);
    flowArrows.push({ mesh: arrow, offset: t + index * 0.13 });
  });
  scene.add(pipeGroup);

  const haloMaterial = new THREE.SpriteMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    map: flowGlowTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particleCount = Math.max(7, Math.round(length * 1.5));
  for (let i = 0; i < particleCount; i += 1) {
    const particle = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.62, 14, 14), markerMaterial);
    particle.castShadow = false;
    particle.renderOrder = 4;
    scene.add(particle);

    const halo = new THREE.Sprite(haloMaterial.clone());
    halo.scale.set(radius * 5.2, radius * 5.2, 1);
    halo.renderOrder = 3;
    scene.add(halo);
    flowParticles.push({ mesh: particle, halo, curve, offset: i / particleCount, speed, radius, name });
  }
  return { mesh: pipeGroup, curve };
}

function cylinderBetween(start, end, radius, material) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const length = a.distanceTo(b);
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.position.copy(mid);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;
  scene.add(cylinder);
  return cylinder;
}

function localBox(group, size, material, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function localCylinder(group, radiusTop, radiusBottom, height, material, position, rotation = [0, 0, 0], segments = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function localTube(group, points, radius, material, segments = 64) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.08);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 18, false), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function localCylinderBetween(group, start, end, radius, material, segments = 12) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const length = a.distanceTo(b);
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  cylinder.position.copy(mid);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;
  group.add(cylinder);
  return cylinder;
}

function addFrontGrille(group, center, width, height, bars, material) {
  const [cx, cy, cz] = center;
  for (let i = 0; i < bars; i += 1) {
    const y = cy - height / 2 + (height * (i + 0.5)) / bars;
    localBox(group, [width, 0.025, 0.035], material, [cx, y, cz]);
  }
}

function addFlangeBolts(group, center, radius, count, color = 0x2f3a46) {
  const boltMat = mat(color, { roughness: 0.32, metalness: 0.58 });
  for (let i = 0; i < count; i += 1) {
    const a = (Math.PI * 2 * i) / count;
    localCylinder(group, 0.025, 0.025, 0.045, boltMat, [center[0], center[1] + Math.cos(a) * radius, center[2] + Math.sin(a) * radius], [0, 0, Math.PI / 2], 10);
  }
}

function addGauge(group, position, color = 0x334155) {
  const gauge = new THREE.Group();
  localCylinder(gauge, 0.11, 0.11, 0.028, mat(0xffffff, { roughness: 0.22, metalness: 0.06 }), [0, 0, 0], [Math.PI / 2, 0, 0], 28);
  localCylinder(gauge, 0.116, 0.116, 0.012, mat(color, { roughness: 0.24, metalness: 0.36 }), [0, -0.018, 0], [Math.PI / 2, 0, 0], 28);
  localBox(gauge, [0.012, 0.012, 0.13], mat(0xe11d48, { roughness: 0.3 }), [0.035, -0.035, 0], [0, 0, -0.8]);
  gauge.position.set(...position);
  gauge.rotation.x = -0.2;
  group.add(gauge);
  return gauge;
}

function createRoom() {
  addMesh(new THREE.BoxGeometry(18, 0.16, 14), materials.floor, [0, -0.08, 0], [0, 0, 0], false, true);

  const grid = new THREE.GridHelper(18, 18, 0x9aa6b2, 0xb7c0cb);
  grid.position.y = 0.005;
  grid.material.transparent = true;
  grid.material.opacity = 0.3;
  scene.add(grid);

  addMesh(new THREE.BoxGeometry(4.8, 0.1, 2.55), materials.concretePad, [-1.4, 0.03, -0.4], [0, 0, 0], false, true);
  addMesh(new THREE.BoxGeometry(2.85, 0.08, 2.25), materials.concretePad, [-4.75, 0.02, 3.55], [0, 0, 0], false, true);
  addMesh(new THREE.BoxGeometry(2.85, 0.08, 2.35), materials.concretePad, [-5.0, 0.02, -5.15], [0, 0, 0], false, true);
  addMesh(new THREE.BoxGeometry(2.35, 0.08, 4.85), materials.concretePad, [5.35, 0.02, 0.15], [0, 0, 0], false, true);
  addMesh(new THREE.BoxGeometry(5.7, 0.08, 2.2), materials.concretePad, [3.05, 0.02, -5.95], [0, 0, 0], false, true);
}

function createChiller() {
  const group = new THREE.Group();
  const shellMat = mat(0x15191f, { roughness: 0.34, metalness: 0.48 });
  const creamMat = mat(0xe9e3cf, { roughness: 0.52, metalness: 0.16 });
  const blueTrim = mat(0x0f4f9f, { roughness: 0.36, metalness: 0.32 });
  const flangeMat = mat(0xcfc7aa, { roughness: 0.42, metalness: 0.28 });
  const tubeMat = mat(0xd8e0e8, { roughness: 0.28, metalness: 0.46 });
  const evaporatorShellMat = mat(0x123b72, { roughness: 0.32, metalness: 0.5, emissive: palette.chws, emissiveIntensity: 0.035 });
  const condenserShellMat = mat(0x0e5c55, { roughness: 0.34, metalness: 0.48, emissive: palette.cws, emissiveIntensity: 0.04 });
  const evaporatorMat = new THREE.MeshPhysicalMaterial({
    color: palette.chws,
    roughness: 0.22,
    metalness: 0.22,
    transparent: true,
    opacity: 0.34,
    transmission: 0.12,
  });
  const condenserMat = new THREE.MeshPhysicalMaterial({
    color: palette.cws,
    roughness: 0.24,
    metalness: 0.24,
    transparent: true,
    opacity: 0.3,
    transmission: 0.1,
  });

  localBox(group, [4.8, 0.18, 1.75], materials.darkSteel, [0, -0.96, 0]);
  for (const x of [-1.9, -0.65, 0.65, 1.9]) {
    localBox(group, [0.22, 0.56, 0.24], materials.darkSteel, [x, -1.18, 0.68]);
    localBox(group, [0.22, 0.56, 0.24], materials.darkSteel, [x, -1.18, -0.68]);
  }

  localCylinder(group, 0.36, 0.36, 4.45, evaporatorShellMat, [0, -0.18, 0.58], [0, 0, Math.PI / 2], 56);
  localCylinder(group, 0.39, 0.39, 0.16, evaporatorShellMat, [-2.32, -0.18, 0.58], [0, 0, Math.PI / 2], 56);
  localCylinder(group, 0.39, 0.39, 0.16, evaporatorShellMat, [2.32, -0.18, 0.58], [0, 0, Math.PI / 2], 56);
  localCylinder(group, 0.4, 0.4, 0.08, flangeMat, [-2.46, -0.18, 0.58], [0, 0, Math.PI / 2], 40);
  addFlangeBolts(group, [-2.52, -0.18, 0.58], 0.33, 14);

  localCylinder(group, 0.34, 0.34, 4.35, condenserShellMat, [0, -0.42, 0.12], [0, 0, Math.PI / 2], 56);
  localCylinder(group, 0.37, 0.37, 0.16, condenserShellMat, [-2.27, -0.42, 0.12], [0, 0, Math.PI / 2], 56);
  localCylinder(group, 0.37, 0.37, 0.16, condenserShellMat, [2.27, -0.42, 0.12], [0, 0, Math.PI / 2], 56);
  localCylinder(group, 0.38, 0.38, 0.08, flangeMat, [-2.42, -0.42, 0.12], [0, 0, Math.PI / 2], 40);
  addFlangeBolts(group, [-2.48, -0.42, 0.12], 0.31, 14);

  localCylinder(group, 0.16, 0.16, 3.2, evaporatorMat, [-0.06, -0.18, 0.86], [0, 0, Math.PI / 2], 28);
  localCylinder(group, 0.15, 0.15, 3.1, condenserMat, [-0.06, -0.42, 0.42], [0, 0, Math.PI / 2], 28);
  for (const [y, z, width] of [[-0.18, 0.86, 3.0], [-0.42, 0.42, 2.8]]) {
    for (const dy of [-0.075, 0, 0.075]) {
      localCylinder(group, 0.012, 0.012, width, tubeMat, [-0.05, y + dy, z + 0.03], [0, 0, Math.PI / 2], 8);
    }
  }

  for (const [y, z, labelColor] of [[-0.18, 0.58, palette.chwr], [-0.58, 0.58, palette.chws], [-0.29, 0.12, palette.cwr], [-0.55, 0.12, palette.cws]]) {
    localCylinder(group, 0.22, 0.22, 0.36, mat(labelColor, { roughness: 0.32, metalness: 0.42 }), [-2.85, y, z], [0, 0, Math.PI / 2], 32);
    localCylinder(group, 0.29, 0.29, 0.1, flangeMat, [-3.08, y, z], [0, 0, Math.PI / 2], 32);
    addFlangeBolts(group, [-3.14, y, z], 0.23, 10);
  }

  localCylinder(group, 0.34, 0.34, 2.45, creamMat, [0.34, 0.58, -0.18], [0, 0, Math.PI / 2], 44);
  localCylinder(group, 0.39, 0.39, 0.16, creamMat, [-0.98, 0.58, -0.18], [0, 0, Math.PI / 2], 44);
  localCylinder(group, 0.39, 0.39, 0.16, creamMat, [1.66, 0.58, -0.18], [0, 0, Math.PI / 2], 44);
  localBox(group, [0.72, 0.62, 0.62], creamMat, [1.88, 0.58, -0.18]);
  localCylinder(group, 0.36, 0.36, 0.62, mat(0x1c2430, { roughness: 0.34, metalness: 0.48 }), [-1.3, 0.58, -0.18], [0, 0, Math.PI / 2], 40);

  for (const x of [-1.15, -0.42, 0.34, 1.1]) {
    localBox(group, [0.12, 0.78, 0.1], creamMat, [x, 0.02, -0.18]);
  }

  localBox(group, [0.72, 0.78, 0.12], creamMat, [0.55, 0.27, 0.7]);
  localBox(group, [0.48, 0.3, 0.06], mat(0x0e3b5d, { emissive: 0x1574d4, emissiveIntensity: 0.38 }), [0.55, 0.38, 0.79]);
  for (const [x, c] of [[0.18, 0x16a34a], [0.32, 0xfacc15], [0.46, 0x22c55e], [0.6, 0xef4444]]) {
    localCylinder(group, 0.035, 0.035, 0.028, mat(c, { emissive: c, emissiveIntensity: 0.55 }), [x, 0.72, 0.79], [Math.PI / 2, 0, 0], 16);
  }
  localBox(group, [0.08, 0.62, 0.08], blueTrim, [0.98, 0.25, 0.72]);
  addGauge(group, [-0.55, 0.16, 0.58], 0x111827);
  addGauge(group, [1.56, 0.9, 0.08], 0x111827);

  localTube(group, [[-1.95, -0.02, 0.38], [-1.72, 0.46, 0.58], [-1.08, 0.78, 0.18], [-0.65, 0.58, -0.18]], 0.08, flangeMat);
  localTube(group, [[1.4, 0.58, -0.18], [1.72, 0.95, -0.18], [2.08, 0.88, -0.02]], 0.07, creamMat);
  localBox(group, [0.2, 0.18, 0.2], materials.warning, [2.12, 0.9, 0.22]);
  localTube(group, [[2.0, 0.9, 0.2], [1.58, 0.74, 0.05], [1.18, 0.58, -0.16]], 0.035, mat(0xd09b38, { roughness: 0.36, metalness: 0.34 }));

  group.position.set(-1.4, 0.86, -0.4);
  scene.add(group);
  label("CH-1\n螺杆式水冷机组", [-1.05, 2.88, 1.35], "#123b5d", "rgba(255,255,255,0.9)", 350);
  label("蒸发器\nEvaporator", [-4.1, 1.98, 1.18], "#123b5d", "rgba(255,255,255,0.82)", 260);
  label("冷凝器\nCondenser", [-4.12, 1.28, 0.38], "#00695c", "rgba(255,255,255,0.82)", 260);
  label("压缩机\nCompressor", [0.05, 2.36, -1.36], "#4a3b12", "rgba(255,255,255,0.82)", 260);
  label("膨胀阀\nEXV", [1.54, 2.02, 0.16], "#8a3f00", "rgba(255,255,255,0.82)", 190);
  label("CHWR 回水进", [-6.18, 1.28, 0.68], "#274472", "rgba(255,255,255,0.78)", 210);
  label("CHWS 供水出", [-6.18, 0.78, 0.68], "#1677ff", "rgba(255,255,255,0.78)", 210);
  label("CWR 回水出", [-6.18, 1.28, -0.72], "#a35200", "rgba(255,255,255,0.78)", 210);
  label("CWS 供水进", [-6.18, 0.74, -0.72], "#00796f", "rgba(255,255,255,0.78)", 210);
  return group;
}

function createPump(name, position, color, rotationY = 0) {
  const group = new THREE.Group();
  const pumpBlue = mat(color, { roughness: 0.34, metalness: 0.42, emissive: color, emissiveIntensity: 0.04 });
  const motorBlue = mat(0x183f9f, { roughness: 0.35, metalness: 0.38 });
  localBox(group, [1.35, 0.11, 0.9], materials.concretePad, [0, 0.02, 0]);
  localBox(group, [1.08, 0.14, 0.68], materials.darkSteel, [0, 0.13, 0]);

  localCylinder(group, 0.3, 0.34, 0.48, pumpBlue, [0, 0.43, 0], [0, 0, 0], 40);
  localCylinder(group, 0.25, 0.25, 1.42, pumpBlue, [0, 0.46, 0], [0, 0, Math.PI / 2], 36);
  localCylinder(group, 0.34, 0.34, 0.12, pumpBlue, [-0.78, 0.46, 0], [0, 0, Math.PI / 2], 36);
  localCylinder(group, 0.34, 0.34, 0.12, pumpBlue, [0.78, 0.46, 0], [0, 0, Math.PI / 2], 36);
  addFlangeBolts(group, [-0.85, 0.46, 0], 0.27, 10);
  addFlangeBolts(group, [0.85, 0.46, 0], 0.27, 10);

  localCylinder(group, 0.34, 0.34, 0.16, materials.darkSteel, [0, 0.72, 0], [0, 0, 0], 40);
  localCylinder(group, 0.26, 0.28, 0.86, motorBlue, [0, 1.21, 0], [0, 0, 0], 48);
  localCylinder(group, 0.32, 0.28, 0.24, motorBlue, [0, 1.79, 0], [0, 0, 0], 48);
  localCylinder(group, 0.2, 0.2, 0.12, mat(0x102a6d, { roughness: 0.28, metalness: 0.36 }), [0, 1.94, 0], [0, 0, 0], 40);

  for (let i = 0; i < 16; i += 1) {
    const angle = (Math.PI * 2 * i) / 16;
    localBox(group, [0.035, 0.68, 0.045], mat(0x102a6d, { roughness: 0.36, metalness: 0.26 }), [Math.cos(angle) * 0.29, 1.22, Math.sin(angle) * 0.29], [0, -angle, 0]);
  }
  localBox(group, [0.36, 0.32, 0.14], motorBlue, [-0.34, 1.18, 0.25]);
  localCylinder(group, 0.08, 0.08, 0.13, materials.darkSteel, [0.35, 1.53, 0], [0, 0, Math.PI / 2], 18);
  addGauge(group, [0.2, 0.92, 0.24]);

  group.position.set(...position);
  group.rotation.y = rotationY;
  scene.add(group);
  label(name, [position[0], position[1] + 2.2, position[2] + 0.52], "#1f2937", "rgba(255,255,255,0.86)", 260);
  return group;
}

function createValve(position, color, rotationY = 0) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.32), mat(color, { roughness: 0.32, metalness: 0.35 }));
  body.castShadow = true;
  group.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.44, 12), materials.darkSteel);
  stem.position.y = 0.36;
  group.add(stem);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 24), materials.darkSteel);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = 0.62;
  group.add(wheel);
  group.position.set(...position);
  group.rotation.y = rotationY;
  scene.add(group);
  return group;
}

function createHorizontalManifold(name, position, color, labelColor, branchXs = []) {
  const group = new THREE.Group();
  const bodyMat = mat(color, { roughness: 0.3, metalness: 0.42, emissive: color, emissiveIntensity: 0.035 });
  const endMat = mat(0xdde7f2, { roughness: 0.38, metalness: 0.22 });
  const flangeMat = mat(0x31556f, { roughness: 0.32, metalness: 0.46 });
  const legMat = mat(0x50606f, { roughness: 0.44, metalness: 0.38 });
  const length = 3.6;
  const radius = 0.34;

  localCylinder(group, radius, radius, length, bodyMat, [0, 0, 0], [0, 0, Math.PI / 2], 64);
  localCylinder(group, radius * 1.05, radius * 1.05, 0.1, endMat, [-length / 2 - 0.03, 0, 0], [0, 0, Math.PI / 2], 48);
  localCylinder(group, radius * 1.05, radius * 1.05, 0.1, endMat, [length / 2 + 0.03, 0, 0], [0, 0, Math.PI / 2], 48);

  for (const x of [-1.25, 1.25]) {
    localBox(group, [0.38, 0.14, 0.7], legMat, [x, -0.48, 0]);
    localBox(group, [0.62, 0.08, 0.82], materials.concretePad, [x, -0.7, 0]);
  }

  branchXs.forEach((x, index) => {
    localCylinder(group, 0.085, 0.085, 0.42, bodyMat, [x, 0.34, 0], [0, 0, 0], 24);
    localCylinder(group, 0.12, 0.12, 0.055, flangeMat, [x, 0.58, 0], [0, 0, 0], 24);
    if (index % 2 === 0) {
      localCylinder(group, 0.07, 0.07, 0.36, bodyMat, [x, -0.33, 0], [0, 0, 0], 24);
    }
  });

  addGauge(group, [length / 2 - 0.52, 0.42, 0.22], labelColor);
  localBox(group, [0.42, 0.22, 0.08], mat(0xe8f0f7, { roughness: 0.42, metalness: 0.18 }), [-length / 2 + 0.72, 0.16, radius + 0.05]);
  localBox(group, [0.28, 0.08, 0.04], mat(labelColor, { emissive: labelColor, emissiveIntensity: 0.28 }), [-length / 2 + 0.72, 0.18, radius + 0.1]);

  group.position.set(...position);
  scene.add(group);
  label(name, [position[0], position[1] + 0.88, position[2] + 0.12], labelColor === palette.chws ? "#134a96" : "#172554", "rgba(255,255,255,0.86)", 290);
  return group;
}

function createLoadRack() {
  const rack = new THREE.Group();
  const frameMat = mat(0x64748b, { roughness: 0.42, metalness: 0.38 });
  const coilMat = mat(0xb9dff7, { roughness: 0.35, metalness: 0.14 });
  const fanMat = mat(0x334155, { roughness: 0.34, metalness: 0.46 });
  const cabinetMat = mat(0xe8eef4, { roughness: 0.58, metalness: 0.14 });
  const doorMat = mat(0xd4dde8, { roughness: 0.52, metalness: 0.12 });

  for (let i = 0; i < 3; i += 1) {
    const z = -2.3 + i * 1.55;
    localBox(rack, [1.92, 0.12, 1.02], materials.concretePad, [0, 0.08, z]);
    localBox(rack, [1.72, 0.86, 0.72], cabinetMat, [0.08, 0.72, z]);
    localBox(rack, [0.58, 0.52, 0.045], doorMat, [-0.28, 0.72, z + 0.39]);
    localBox(rack, [0.58, 0.52, 0.045], doorMat, [0.4, 0.72, z + 0.39]);
    localBox(rack, [0.55, 0.28, 0.24], mat(0xc7d3df, { roughness: 0.5, metalness: 0.16 }), [1.03, 0.92, z]);
    localBox(rack, [0.78, 0.18, 0.56], mat(0xb9c6d2, { roughness: 0.5, metalness: 0.18 }), [-0.96, 0.92, z]);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.08, 0.2), frameMat);
    frame.position.set(-0.96, 0.7, z - 0.45);
    frame.castShadow = true;
    rack.add(frame);

    const casing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.92, 0.08), mat(0xe7edf4, { roughness: 0.56, metalness: 0.12 }));
    casing.position.set(-0.96, 0.7, z - 0.34);
    casing.castShadow = true;
    rack.add(casing);

    const coil = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.66, 0.08), coilMat);
    coil.position.set(-1.1, 0.7, z - 0.48);
    rack.add(coil);

    for (let x = -0.45; x <= 0.45; x += 0.3) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.72, 0.1), mat(0x84b8d6, { roughness: 0.4, metalness: 0.2 }));
      fin.position.set(x - 1.1, 0.7, z - 0.54);
      rack.add(fin);
    }
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.045, 28), fanMat);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(0.63, 0.72, z + 0.41);
    rack.add(fan);
    pumpRotors.push(fan);
    for (let blade = 0; blade < 3; blade += 1) {
      const fanBlade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.018), mat(0xb8c7d5, { roughness: 0.28, metalness: 0.22 }));
      fanBlade.position.copy(fan.position);
      fanBlade.rotation.z = (Math.PI * 2 * blade) / 3;
      rack.add(fanBlade);
      pumpRotors.push(fanBlade);
    }
  }

  rack.position.set(5.3, 0.15, 0.35);
  scene.add(rack);
  label("AHU / FCU\n末端空调设备", [5.3, 2.08, 2.1], "#134a96", "rgba(255,255,255,0.88)", 340);
}

function createRoundCoolingTowerUnit(name, position) {
  const group = new THREE.Group();
  const towerMat = mat(0xd9e2dc, { roughness: 0.58, metalness: 0.12 });
  const ribMat = mat(0xb8c5c1, { roughness: 0.48, metalness: 0.22 });
  const louverMat = mat(0x7b8a86, { roughness: 0.44, metalness: 0.34 });

  localCylinder(group, 0.98, 1.08, 0.36, materials.darkSteel, [0, 0.28, 0], [0, 0, 0], 72);
  localCylinder(group, 0.84, 1.0, 1.28, towerMat, [0, 1.1, 0], [0, 0, 0], 96);
  localCylinder(group, 0.7, 0.84, 0.42, towerMat, [0, 1.95, 0], [0, 0, 0], 96);
  localCylinder(group, 0.55, 0.55, 0.12, materials.darkSteel, [0, 2.2, 0], [0, 0, 0], 72);

  for (let i = 0; i < 24; i += 1) {
    const a = (Math.PI * 2 * i) / 24;
    const radius = 0.94;
    localBox(group, [0.035, 1.16, 0.055], ribMat, [Math.cos(a) * radius, 1.16, Math.sin(a) * radius], [0, -a, 0]);
  }
  for (let i = 0; i < 36; i += 1) {
    const a = (Math.PI * 2 * i) / 36;
    localBox(group, [0.12, 0.23, 0.025], louverMat, [Math.cos(a) * 1.02, 0.6, Math.sin(a) * 1.02], [0, -a, 0]);
  }

  const fanGroup = new THREE.Group();
  const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 14, 44), mat(0x3b7180, { metalness: 0.34 }));
  fanRing.rotation.x = Math.PI / 2;
  fanGroup.add(fanRing);
  for (let i = 0; i < 5; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.055, 0.025), mat(0xd8eff2, { roughness: 0.24, metalness: 0.16 }));
    blade.rotation.z = (Math.PI * 2 * i) / 5;
    fanGroup.add(blade);
  }
  fanGroup.position.set(0, 2.27, 0);
  group.add(fanGroup);
  pumpRotors.push(fanGroup);

  localCylinder(group, 0.13, 0.13, 0.54, mat(palette.cws, { metalness: 0.38 }), [0, 0.82, 1.0], [Math.PI / 2, 0, 0], 24);
  localCylinder(group, 0.13, 0.13, 0.54, mat(palette.cwr, { metalness: 0.38 }), [0, 1.38, -1.0], [Math.PI / 2, 0, 0], 24);
  addGauge(group, [0.65, 1.4, 0.68], 0x00695c);

  group.position.set(...position);
  scene.add(group);
  label(name, [position[0], 3.1, position[2] + 0.35], "#00695c", "rgba(255,255,255,0.88)", 230);
  return group;
}

function createRectCoolingTowerUnit(name, position) {
  const group = new THREE.Group();
  const bodyMat = mat(0xe8edf1, { roughness: 0.54, metalness: 0.16 });
  const basinMat = mat(0x6c7a86, { roughness: 0.44, metalness: 0.36 });
  const cornerMat = mat(0xc4cdd5, { roughness: 0.44, metalness: 0.22 });
  const darkLouver = mat(0x15232b, { roughness: 0.5, metalness: 0.16 });
  const braceMat = mat(0xf1f5f9, { roughness: 0.42, metalness: 0.12 });
  const fanStackMat = mat(0x22313d, { roughness: 0.42, metalness: 0.36 });
  const mistMat = new THREE.SpriteMaterial({
    color: 0xd6f8ff,
    transparent: true,
    opacity: 0.17,
    map: flowGlowTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  localBox(group, [2.5, 0.32, 1.36], basinMat, [0, 0.24, 0]);
  localBox(group, [2.24, 1.22, 1.12], bodyMat, [0, 1.06, 0]);
  localBox(group, [2.42, 0.12, 1.3], fanStackMat, [0, 1.73, 0]);
  localBox(group, [2.48, 0.08, 1.38], cornerMat, [0, 0.52, 0]);

  for (const x of [-1.08, 1.08]) {
    localBox(group, [0.08, 1.34, 1.2], cornerMat, [x, 1.1, 0]);
  }
  for (const z of [-0.58, 0.58]) {
    localBox(group, [2.24, 1.34, 0.055], cornerMat, [0, 1.1, z]);
  }

  for (const x of [-0.78, -0.39, 0, 0.39, 0.78]) {
    localBox(group, [0.03, 0.82, 0.055], materials.grille, [x, 1.02, 0.63]);
    localBox(group, [0.03, 0.82, 0.055], materials.grille, [x, 1.02, -0.63]);
  }
  addFrontGrille(group, [0, 1.02, 0.66], 1.94, 0.76, 9, materials.grille);
  addFrontGrille(group, [0, 1.02, -0.66], 1.94, 0.76, 9, materials.grille);

  for (const sideZ of [0.685, -0.685]) {
    for (const x of [-0.55, 0.55]) {
      localBox(group, [0.82, 0.78, 0.035], darkLouver, [x, 1.02, sideZ]);
      localCylinderBetween(group, [x - 0.37, 0.66, sideZ + Math.sign(sideZ) * 0.035], [x + 0.37, 1.38, sideZ + Math.sign(sideZ) * 0.035], 0.018, braceMat, 8);
      localCylinderBetween(group, [x + 0.37, 0.66, sideZ + Math.sign(sideZ) * 0.035], [x - 0.37, 1.38, sideZ + Math.sign(sideZ) * 0.035], 0.018, braceMat, 8);
      for (let row = 0; row < 5; row += 1) {
        localBox(group, [0.72, 0.018, 0.04], mat(0x2f3b45, { roughness: 0.5, metalness: 0.12 }), [x, 0.78 + row * 0.12, sideZ + Math.sign(sideZ) * 0.055], [0.12 * Math.sign(sideZ), 0, 0]);
      }
    }
  }

  for (const sideX of [-1.16, 1.16]) {
    localBox(group, [0.04, 0.72, 0.82], darkLouver, [sideX, 1.02, 0]);
    for (let z = -0.33; z <= 0.33; z += 0.22) {
      localBox(group, [0.055, 0.68, 0.025], materials.grille, [sideX, 1.02, z]);
    }
  }

  for (const x of [-0.52, 0.52]) {
    const fanGroup = new THREE.Group();
    localCylinder(group, 0.42, 0.42, 0.2, fanStackMat, [x, 1.91, 0], [0, 0, 0], 48);
    localCylinder(group, 0.35, 0.35, 0.22, mat(0xdce7ee, { roughness: 0.38, metalness: 0.18 }), [x, 1.98, 0], [0, 0, 0], 48);
    const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.026, 12, 44), mat(0x2e5f73, { metalness: 0.34 }));
    fanRing.rotation.x = Math.PI / 2;
    fanGroup.add(fanRing);
    for (let i = 0; i < 4; i += 1) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.048, 0.02), mat(0xd7edf6, { roughness: 0.25 }));
      blade.rotation.z = (Math.PI / 2) * i;
      fanGroup.add(blade);
    }
    fanGroup.position.set(x, 2.11, 0);
    group.add(fanGroup);
    pumpRotors.push(fanGroup);
    const mist = new THREE.Sprite(mistMat.clone());
    mist.position.set(x, 2.36, 0);
    mist.scale.set(0.62, 0.62, 1);
    mist.renderOrder = 2;
    group.add(mist);
  }

  for (const x of [-0.9, 0.9]) {
    for (const z of [-0.46, 0.46]) {
      localCylinder(group, 0.04, 0.04, 0.72, materials.darkSteel, [x, -0.08, z], [0, 0, 0], 12);
    }
  }
  localBox(group, [0.38, 0.72, 0.045], mat(0xb7c1cb, { roughness: 0.5, metalness: 0.18 }), [1.05, 1.02, 0.38]);
  localBox(group, [0.24, 0.08, 0.035], mat(0x475569, { roughness: 0.4, metalness: 0.32 }), [1.05, 0.96, 0.405]);
  localCylinder(group, 0.13, 0.13, 0.46, mat(palette.cws, { metalness: 0.38 }), [0, 0.82, 0.76], [Math.PI / 2, 0, 0], 24);
  localCylinder(group, 0.13, 0.13, 0.46, mat(palette.cwr, { metalness: 0.38 }), [0, 1.38, -0.76], [Math.PI / 2, 0, 0], 24);
  addGauge(group, [0.74, 1.42, 0.52], 0x00695c);

  group.position.set(...position);
  scene.add(group);
  label(name, [position[0], 2.92, position[2] + 0.45], "#00695c", "rgba(255,255,255,0.88)", 230);
  return group;
}

function createCoolingTowerInterface() {
  createRectCoolingTowerUnit("冷却塔\nCT-1", [1.65, 0.12, -5.95]);
  createRectCoolingTowerUnit("冷却塔\nCT-2", [4.35, 0.12, -5.95]);
}

function createSensorsAndSupports() {
  const sensorMat = mat(0xffffff, { roughness: 0.28, metalness: 0.12, emissive: 0x72a7ff, emissiveIntensity: 0.18 });
  [
    ["TT", [0.2, 1.55, 2.9]],
    ["DP", [3.4, 1.55, 2.9]],
    ["TT", [0.2, 1.35, 4.65]],
  ].forEach(([name, pos]) => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), sensorMat);
    sphere.position.set(...pos);
    sphere.castShadow = true;
    scene.add(sphere);
    label(name, [pos[0], pos[1] + 0.45, pos[2]], "#334155", "rgba(255,255,255,0.84)", 130);
  });

  for (let x = -5; x <= 5; x += 2.5) {
    cylinderBetween([x, 0.02, 3.15], [x, 1.16, 3.15], 0.035, materials.darkSteel);
    cylinderBetween([x, 0.02, 4.55], [x, 1.02, 4.55], 0.035, materials.darkSteel);
  }
}

function createPipes() {
  pipe("CHWR terminals to collector", [[5.22, 1.05, -1.9], [5.86, 1.05, -1.9], [5.86, 0.92, 4.55], [3.95, 0.92, 4.55]], palette.chwr, 0.105, 0.07);
  pipe("CHWR collector to chilled pump header", [[0.25, 0.92, 4.55], [-5.58, 0.92, 4.55], [-5.58, 0.54, 3.55]], palette.chwr, 0.105, 0.085);
  pipe("CHWR pump P1 suction", [[-5.58, 0.54, 3.55], [-5.58, 0.54, 2.95]], palette.chwr, 0.078, 0.11);
  pipe("CHWR pump P2 suction", [[-5.58, 0.54, 3.55], [-5.58, 0.54, 4.15]], palette.chwr, 0.078, 0.11);
  pipe("CHWR pump P1 discharge outside rack", [[-3.9, 0.54, 2.95], [-6.25, 0.54, 2.95], [-6.25, 1.02, 0.14], [-4.9, 1.02, 0.14]], palette.chwr, 0.092, 0.1);
  pipe("CHWR pump P2 discharge outside rack", [[-3.9, 0.54, 4.15], [-6.55, 0.54, 4.15], [-6.55, 0.82, 0.14], [-6.25, 0.82, 0.14]], palette.chwr, 0.072, 0.1);
  pipe("CHWR short connector to evaporator", [[-4.9, 1.02, 0.14], [-4.9, chillerPorts.chwrIn[1], chillerPorts.chwrIn[2]], chillerPorts.chwrIn], palette.chwr, 0.098, 0.085);

  pipe("CHWS evaporator out to outside rack", [chillerPorts.chwsOut, [-4.9, chillerPorts.chwsOut[1], chillerPorts.chwsOut[2]], [-4.9, 1.42, 0.14], [-6.05, 1.42, 0.14], [-6.05, 1.42, 2.35], [0.25, 1.12, 2.95]], palette.chws, 0.11, 0.085);
  pipe("CHWS distributor to terminal units", [[3.95, 1.12, 2.95], [5.78, 1.12, 2.95], [5.78, 1.3, -1.1], [5.25, 1.3, -1.1]], palette.chws, 0.11, 0.085);
  pipe("CHWS terminal branches", [[5.78, 1.3, 1.35], [5.25, 1.3, 1.35], [5.25, 1.3, 0.35], [5.25, 1.3, -1.1]], palette.chws, 0.072, 0.12);

  pipe("CWS CT-1 to cooling pump header", [[1.65, 0.94, -5.18], [1.65, 1.18, -4.75], [-5.6, 1.18, -4.75], [-5.6, 0.54, -4.55]], palette.cws, 0.1, 0.095);
  pipe("CWS CT-2 to cooling pump header", [[4.35, 0.94, -5.18], [4.35, 1.18, -4.75], [-5.6, 1.18, -4.75]], palette.cws, 0.076, 0.11);
  pipe("CWS pump P1 discharge outside rack", [[-4.05, 0.54, -4.55], [-6.35, 0.54, -4.55], [-6.35, 0.92, -0.94], [-4.95, 0.92, -0.94]], palette.cws, 0.092, 0.105);
  pipe("CWS pump P2 discharge outside rack", [[-4.05, 0.54, -5.75], [-6.68, 0.54, -5.75], [-6.68, 0.74, -0.94], [-6.35, 0.74, -0.94]], palette.cws, 0.072, 0.105);
  pipe("CWS short connector to condenser", [[-4.95, 0.92, -0.94], [-4.95, chillerPorts.cwsIn[1], chillerPorts.cwsIn[2]], chillerPorts.cwsIn], palette.cws, 0.098, 0.09);

  pipe("CWR condenser out to outside rack", [chillerPorts.cwrOut, [-4.95, chillerPorts.cwrOut[1], chillerPorts.cwrOut[2]], [-4.95, 1.62, -0.94], [-6.05, 1.62, -0.94], [-6.05, 1.62, -3.25], [2.95, 1.62, -3.25], [2.95, 1.62, -6.68]], palette.cwr, 0.11, 0.072);
  pipe("CWR CT-1 inlet", [[2.95, 1.62, -6.68], [1.65, 1.62, -6.68], [1.65, 1.5, -6.7]], palette.cwr, 0.076, 0.105);
  pipe("CWR CT-2 inlet", [[2.95, 1.62, -6.68], [4.35, 1.62, -6.68], [4.35, 1.5, -6.7]], palette.cwr, 0.076, 0.105);

  createValve([4.82, 1.12, 2.95], palette.chws, 0);
  createValve([4.75, 0.92, 4.55], palette.chwr, 0);
  createValve([1.7, 1.62, -6.68], palette.cwr, Math.PI / 2);
  createValve([-3.55, 0.54, -2.55], palette.cws, 0);
}

function createScene() {
  createRoom();
  createChiller();
  createPump("P-CHW-1", [-4.7, 0.05, 2.95], palette.chws);
  createPump("P-CHW-2", [-4.7, 0.05, 4.15], palette.chws);
  createPump("P-CW-1", [-5.0, 0.05, -4.55], palette.cws);
  createPump("P-CW-2", [-5.0, 0.05, -5.75], palette.cws);
  createLoadRack();
  createCoolingTowerInterface();
  createHorizontalManifold("分水器\nCHWS", [2.1, 1.12, 2.95], palette.chws, palette.chws, [-1.55, 0, 1.55]);
  createHorizontalManifold("集水器\nCHWR", [2.1, 0.92, 4.55], palette.chwr, palette.chwr, [-1.55, 0, 1.55]);
  createPipes();
  createSensorsAndSupports();

  const drain = addMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 24), materials.warning, [-1.0, 0.3, 5.6], [0, 0, 0]);
  drain.name = "expansion tank";
  label("膨胀水箱\n补水定压", [-1.0, 1.35, 5.6], "#8a3f00", "rgba(255,255,255,0.88)", 280);
}

function addLights() {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa6b2, 1.6);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(6, 9, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  scene.add(key);

  const fill = new THREE.PointLight(0xffffff, 1.2, 22);
  fill.position.set(-5, 5.5, 5);
  scene.add(fill);
}

function fitViewport() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  if (width < 700) {
    camera.fov = 54;
    camera.position.set(10.5, 8.8, 22);
    controls.target.set(0.65, 1.25, -0.15);
  } else {
    camera.fov = 48;
    camera.position.set(11, 8, 13);
    controls.target.set(1.4, 1.1, -0.6);
  }
  sceneLabels.forEach((sprite) => {
    const factor = width < 700 ? 0.68 : 1;
    sprite.scale.copy(sprite.userData.baseScale).multiplyScalar(factor);
  });
  camera.updateProjectionMatrix();
  controls.update();
}

function animate() {
  const elapsed = clock.getElapsedTime();
  controls.update();

  flowParticles.forEach(({ mesh, halo, curve, offset, speed, radius }, index) => {
    const t = (elapsed * speed + offset) % 1;
    const pos = curve.getPointAt(t);
    const pulse = 1 + Math.sin((elapsed * 6 + offset * 12 + index) * Math.PI) * 0.18;
    mesh.position.copy(pos);
    mesh.scale.setScalar(pulse);
    if (halo) {
      halo.position.copy(pos);
      halo.material.opacity = 0.08 + pulse * 0.045;
      halo.scale.set(radius * (4.8 + pulse * 1.4), radius * (4.8 + pulse * 1.4), 1);
    }
  });

  pumpRotors.forEach((rotor, index) => {
    rotor.rotation.z += index % 2 ? 0.035 : 0.05;
  });

  flowArrows.forEach(({ mesh, offset }, index) => {
    const pulse = 0.86 + Math.sin(elapsed * 4 + offset * 8 + index) * 0.16;
    mesh.material.opacity = 0.24 + pulse * 0.14;
    mesh.scale.setScalar(pulse);
  });

  renderer.render(scene, camera);
  window.__HVAC_SCENE_READY = true;
  requestAnimationFrame(animate);
}

addLights();
createScene();
fitViewport();
animate();

window.addEventListener("resize", fitViewport);
