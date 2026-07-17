import * as THREE from "three";

import { WATER_CIRCUITS } from "../data/plant-data.js";
import { physical } from "./materials.js";

export const PIPE_ROUTES = Object.freeze({
  chws: [
    [[0.25, 1.88, 0.33], [0.25, 2.16, 2.55], [0.12, 1.48, 3.1]],
    [[4.32, 1.48, 3.1], [6.05, 1.48, 3.1], [6.05, 1.48, 1.45], [3.12, 0.42, 1.45]],
  ],
  chwr: [
    [[3.12, 0.42, -0.65], [6.28, 1.25, -0.65], [6.28, 1.25, 4.55], [4.32, 1.25, 4.55]],
    [[0.12, 1.25, 4.55], [-6.55, 1.25, 4.55], [-6.55, 0.64, 3.48], [-6.15, 0.64, 3.48]],
    [[-4.05, 0.64, 2.8], [-3.55, 0.64, 2.8], [-3.55, 1.68, 0.33], [-2.65, 1.68, 0.33]],
    [[-4.05, 0.64, 4.2], [-3.25, 0.64, 4.2], [-3.25, 1.52, 0.5], [-2.65, 1.52, 0.5]],
  ],
  cws: [
    [[1.8, 0.45, -4.8], [1.8, 1.18, -4.45], [-6.45, 1.18, -4.45], [-6.45, 0.64, -3.7], [-6.15, 0.64, -3.7]],
    [[4.8, 0.45, -4.8], [4.8, 1.42, -4.7], [-6.75, 1.42, -4.7], [-6.75, 0.64, -5.1], [-6.15, 0.64, -5.1]],
    [[-4.05, 0.64, -3.7], [-3.6, 0.64, -3.7], [-3.6, 1.42, -0.78], [-2.65, 1.42, -0.78]],
    [[-4.05, 0.64, -5.1], [-3.25, 0.64, -5.1], [-3.25, 1.28, -0.63], [-2.65, 1.28, -0.63]],
  ],
  cwr: [
    [[0.42, 1.55, -0.78], [0.42, 2.12, -2.75], [3.3, 2.12, -2.75], [3.3, 1.62, -6.5]],
    [[3.3, 1.62, -6.5], [1.8, 1.62, -6.5], [1.8, 1.48, -6.3]],
    [[3.3, 1.62, -6.5], [4.8, 1.62, -6.5], [4.8, 1.48, -6.3]],
  ],
});

export function buildFlowSystem(routes = PIPE_ROUTES) {
  const network = new THREE.Group();
  network.name = "plant-pipe-network";
  const flowSystems = [];
  const sharedParticleGeometry = new THREE.SphereGeometry(0.055, 10, 8);

  for (const circuit of WATER_CIRCUITS) {
    const circuitGroup = new THREE.Group();
    circuitGroup.name = `circuit-${circuit.id}`;
    const systems = [];
    const pipeMaterial = physical(circuit.color, { roughness: 0.2, metalness: 0.58, transparent: true, opacity: 0.9 });
    const coreMaterial = new THREE.MeshBasicMaterial({ color: circuit.color, transparent: true, opacity: 0.56, toneMapped: false });
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.96, toneMapped: false });
    const particles = [];

    for (const [routeIndex, route] of (routes[circuit.id] ?? []).entries()) {
      const curve = createOrthogonalCurve(route);
      const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(32, route.length * 18), routeIndex === 0 ? 0.105 : 0.082, 14, false), pipeMaterial);
      pipe.name = `${circuit.id}-pipe-${routeIndex + 1}`;
      pipe.castShadow = true;
      pipe.receiveShadow = true;
      circuitGroup.add(pipe);
      const core = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(32, route.length * 18), routeIndex === 0 ? 0.04 : 0.03, 8, false), coreMaterial);
      core.name = `${circuit.id}-core-${routeIndex + 1}`;
      circuitGroup.add(core);

      route.slice(1, -1).forEach((point, elbowIndex) => {
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(routeIndex === 0 ? 0.11 : 0.087, 14, 10), pipeMaterial);
        elbow.position.fromArray(point);
        elbow.name = `${circuit.id}-elbow-${routeIndex + 1}-${elbowIndex + 1}`;
        circuitGroup.add(elbow);
      });

      const count = Math.max(5, Math.round(curve.getLength() * 0.65));
      for (let index = 0; index < count; index += 1) {
        const particle = new THREE.Mesh(sharedParticleGeometry, particleMaterial);
        particle.name = `${circuit.id}-flow-particle-${routeIndex + 1}-${index + 1}`;
        circuitGroup.add(particle);
        particles.push({ mesh: particle, curve, phase: index / count, speed: 0.035 + circuit.flowM3h / 14000 });
      }
      systems.push({ curve, pipe, core });
    }
    network.add(circuitGroup);
    flowSystems.push({ ...circuit, group: circuitGroup, routes: systems, particles });
  }
  return { network, flowSystems };
}

export function updateFlowSystems(flowSystems, elapsed, motionScale = 1) {
  for (const system of flowSystems) {
    for (const particle of system.particles) {
      const t = (particle.phase + elapsed * particle.speed * motionScale) % 1;
      const point = Number.isFinite(t) ? particle.curve.getPointAt(t) : null;
      if (!point) continue;
      particle.mesh.position.copy(point);
      const pulse = 0.9 + Math.sin((elapsed * 7 + particle.phase * 12) * Math.PI) * 0.18;
      particle.mesh.scale.setScalar(pulse);
    }
  }
}

function createOrthogonalCurve(points) {
  const curve = new THREE.CurvePath();
  const vectors = points.map((point) => new THREE.Vector3(...point));
  for (let index = 1; index < vectors.length; index += 1) {
    curve.add(new THREE.LineCurve3(vectors[index - 1], vectors[index]));
  }
  return curve;
}
