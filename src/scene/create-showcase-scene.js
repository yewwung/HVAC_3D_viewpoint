import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { REFRIGERATION_CYCLE } from "../data/plant-data.js";
import { createPlantModel, setPlantPresentation, updatePlantModel } from "./create-plant-model.js";

const DEFAULT_CAMERA = new THREE.Vector3(12.4, 8.1, 14.1);
const DEFAULT_TARGET = new THREE.Vector3(0.35, 1.0, -0.35);

export function createShowcaseScene({ canvas, onEquipmentSelect, onTourInterrupt }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07111d);
  scene.fog = new THREE.Fog(0x07111d, 25, 52);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.35 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;

  const camera = new THREE.PerspectiveCamera(mobile ? 54 : 45, 1, 0.1, 100);
  camera.position.copy(mobile ? new THREE.Vector3(15.5, 10.5, 19.5) : DEFAULT_CAMERA);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 3.2;
  controls.maxDistance = 32;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.copy(DEFAULT_TARGET);
  controls.update();

  const plant = createPlantModel();
  scene.add(plant.group);
  addLighting(scene);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const labelElements = new Map();
  const componentLabelElements = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let currentState = { mode: "initial", tourEnabled: false, pipesVisible: false, labelsVisible: false, selectedEquipmentId: null };
  let selectionHelper = null;
  let cameraTween = null;
  let pointerDown = null;
  let lastCycleStage = -1;
  let lastFrameTime = performance.now();
  let elapsedTime = 0;

  controls.addEventListener("start", () => {
    if (currentState.tourEnabled) onTourInterrupt?.();
  });
  canvas.addEventListener("pointerdown", (event) => {
    pointerDown = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 7) return;
    pickEquipment(event);
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement);
  resize();
  renderer.setAnimationLoop(render);

  function pickEquipment(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(plant.group, true).find((intersection) => intersection.object.userData.equipmentId);
    const equipmentId = hit?.object.userData.equipmentId ?? null;
    selectEquipment(equipmentId);
    onEquipmentSelect?.(equipmentId);
  }

  function selectEquipment(equipmentId) {
    if (selectionHelper) {
      scene.remove(selectionHelper);
      selectionHelper.geometry.dispose();
      selectionHelper.material.dispose();
      selectionHelper = null;
    }
    if (["mau", "xray", "principle"].includes(currentState.mode)) return;
    if (!equipmentId || !plant.equipment.has(equipmentId)) return;
    selectionHelper = new THREE.Box3Helper(new THREE.Box3().setFromObject(plant.equipment.get(equipmentId)), 0xf3a03d);
    selectionHelper.name = "equipment-selection";
    selectionHelper.material.depthTest = false;
    selectionHelper.material.transparent = true;
    selectionHelper.material.opacity = 0.92;
    selectionHelper.renderOrder = 20;
    scene.add(selectionHelper);
  }

  function focusEquipment(equipmentId) {
    const equipment = plant.equipment.get(equipmentId);
    if (!equipment) return false;
    const focus = equipment.userData.focusPoint?.clone() ?? new THREE.Vector3(0, 0.8, 0);
    equipment.localToWorld(focus);
    const baseDistance = equipment.userData.focusDistance ?? 6;
    const distance = equipmentId === "MAU-01" && mobile ? baseDistance * 1.86 : baseDistance;
    const direction = equipmentId === "MAU-01"
      ? new THREE.Vector3(-0.18, 0.24, 1.0).normalize()
      : new THREE.Vector3(1.15, 0.62, 1.25).normalize();
    beginCameraTween(focus.clone().add(direction.multiplyScalar(distance)), focus);
    selectEquipment(equipmentId);
    return true;
  }

  function resetView() {
    if (currentState.mode === "mau") {
      focusEquipment("MAU-01");
      return;
    }
    beginCameraTween(mobile ? new THREE.Vector3(15.5, 10.5, 19.5) : DEFAULT_CAMERA.clone(), DEFAULT_TARGET.clone());
    selectEquipment(null);
  }

  function beginCameraTween(position, target) {
    cameraTween = {
      startedAt: performance.now(),
      duration: reducedMotion ? 1 : 900,
      fromPosition: camera.position.clone(),
      toPosition: position,
      fromTarget: controls.target.clone(),
      toTarget: target,
    };
  }

  function setPresentation(state) {
    const previousMode = currentState.mode;
    currentState = state;
    setPlantPresentation(plant, state);
    controls.minDistance = state.mode === "mau" ? (mobile ? 9.5 : 5.0) : 3.2;
    controls.maxDistance = state.mode === "mau" ? (mobile ? 19 : 15) : 32;
    selectEquipment(state.selectedEquipmentId);
    if (state.mode === "mau" && previousMode !== "mau") focusEquipment("MAU-01");
    if (state.mode === "principle" && previousMode !== "principle") focusEquipment("CH-01");
    if (state.mode === "xray" && previousMode !== "xray") focusEquipment(state.selectedEquipmentId ?? "CH-01");
  }

  function registerLabel(id, element) {
    labelElements.set(id, element);
  }

  function registerComponentLabel(equipmentId, componentName, element) {
    const equipment = plant.equipment.get(equipmentId);
    const component = equipment?.getObjectByName(componentName);
    if (component) componentLabelElements.push({ component, element });
  }

  function render(frameTime = performance.now()) {
    const now = Number.isFinite(frameTime) ? frameTime : performance.now();
    const delta = THREE.MathUtils.clamp((now - lastFrameTime) / 1000, 0, 0.05);
    lastFrameTime = now;
    elapsedTime += delta;
    const elapsed = elapsedTime;
    const motionScale = reducedMotion ? 0.25 : 1;
    updatePlantModel(plant, delta, elapsed, { motionScale });
    updatePrincipleStage(elapsed);
    updateCamera(delta);
    controls.update();
    updateLabels();
    updateComponentLabels();
    renderer.render(scene, camera);
    window.__HVAC_SCENE_READY = true;
  }

  function updateCamera(delta) {
    if (cameraTween) {
      const progress = Math.min(1, (performance.now() - cameraTween.startedAt) / cameraTween.duration);
      const eased = 1 - (1 - progress) ** 3;
      camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
      controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
      if (progress >= 1) cameraTween = null;
      return;
    }
    if (currentState.tourEnabled && !reducedMotion) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.045);
      camera.position.copy(controls.target).add(offset);
    }
  }

  function updatePrincipleStage(elapsed) {
    const chiller = plant.equipment.get("CH-01");
    const stageIndex = currentState.mode === "principle" ? Math.floor(elapsed / 2.2) % REFRIGERATION_CYCLE.length : -1;
    if (stageIndex !== lastCycleStage) {
      lastCycleStage = stageIndex;
      document.documentElement.dataset.cycleStage = String(stageIndex);
    }
    const pathNames = ["hot-gas-line", "liquid-line", "expansion-line", "suction-line"];
    pathNames.forEach((name, index) => {
      const path = chiller.getObjectByName(name);
      if (!path) return;
      path.material.opacity = currentState.mode === "principle" ? (index === stageIndex ? 1 : 0.2) : 1;
      path.material.emissiveIntensity = currentState.mode === "principle" && index === stageIndex ? 0.8 : 0.22;
    });
  }

  function updateLabels() {
    for (const [id, element] of labelElements) {
      const equipment = plant.equipment.get(id);
      if (!equipment || !currentState.labelsVisible || currentState.mode !== "overview") {
        element.style.display = "none";
        continue;
      }
      const point = equipment.userData.focusPoint?.clone() ?? new THREE.Vector3(0, 1.2, 0);
      equipment.localToWorld(point);
      point.project(camera);
      const visible = point.z > -1 && point.z < 1 && Math.abs(point.x) < 1.08 && Math.abs(point.y) < 1.08;
      element.style.display = visible ? "" : "none";
      if (!visible) continue;
      const x = (point.x * 0.5 + 0.5) * canvas.clientWidth;
      const y = (-point.y * 0.5 + 0.5) * canvas.clientHeight;
      element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      element.style.zIndex = String(Math.max(1, Math.round((1 - point.z) * 10)));
    }
  }

  function updateComponentLabels() {
    for (const { component, element } of componentLabelElements) {
      if (element.hidden) continue;
      const point = component.getWorldPosition(new THREE.Vector3());
      point.y += 0.38;
      point.project(camera);
      const visible = point.z > -1 && point.z < 1 && Math.abs(point.x) < 1.08 && Math.abs(point.y) < 1.08;
      element.style.display = visible ? "" : "none";
      if (!visible) continue;
      const x = (point.x * 0.5 + 0.5) * canvas.clientWidth;
      const y = (-point.y * 0.5 + 0.5) * canvas.clientHeight;
      element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    }
  }

  function resize() {
    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  return {
    focusEquipment,
    resetView,
    setPresentation,
    registerLabel,
    registerComponentLabel,
    dispose() {
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
    },
  };
}

function addLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xeaf6f3, 0x07111d, 1.38));
  scene.add(new THREE.AmbientLight(0x779eb1, 0.24));
  const key = new THREE.DirectionalLight(0xfff4dc, 2.8);
  key.position.set(8, 13, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 42;
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 11;
  key.shadow.camera.bottom = -11;
  scene.add(key);
  const coolFill = new THREE.DirectionalLight(0x75ddec, 1.05);
  coolFill.position.set(-10, 6, 7);
  scene.add(coolFill);
  const equipmentSpot = new THREE.SpotLight(0xffb46a, 28, 26, Math.PI * 0.2, 0.72, 1.2);
  equipmentSpot.position.set(1, 9, 7);
  equipmentSpot.target.position.set(-1.2, 0.7, -0.2);
  scene.add(equipmentSpot, equipmentSpot.target);

  const mauRim = new THREE.SpotLight(0xd7f5ff, 42, 22, Math.PI * 0.2, 0.58, 1.25);
  mauRim.position.set(4.8, 7.4, 5.8);
  mauRim.target.position.set(4.6, 0.9, 0.4);
  scene.add(mauRim, mauRim.target);

  const intakeGlow = new THREE.PointLight(0xff4d52, 5.2, 5.5, 2);
  intakeGlow.position.set(2.35, 1.1, 2.3);
  scene.add(intakeGlow);

  const coilGlow = new THREE.PointLight(0x18c8ff, 6.2, 5.3, 2);
  coilGlow.position.set(3.15, 1.1, 2.1);
  scene.add(coilGlow);
}
