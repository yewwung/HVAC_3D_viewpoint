import { Box, createIcons, Orbit, RotateCcw, Route, ScanLine, Tags, Wind, Workflow, X } from "lucide";

import { HYDRONIC_LOOPS, MAU_PROCESS_STAGES, getEquipmentById } from "../data/plant-data.js";

const LABEL_IDS = ["CH-01", "P-CHW-01", "P-CW-01", "CT-01", "CT-02", "MAU-01"];
const COMPONENT_LABELS = [
  ["CH-01", "evaporator-tube-bundle", "蒸发器管束"],
  ["CH-01", "evaporator-tube-sheet", "蒸发器管板"],
  ["CH-01", "condenser-tube-bundle", "冷凝器管束"],
  ["CH-01", "condenser-tube-sheet", "冷凝器管板"],
  ["CH-01", "screw-rotor-a", "双螺杆转子"],
  ["CH-01", "expansion-valve", "电子膨胀阀"],
  ...["P-CHW-01", "P-CHW-02", "P-CW-01", "P-CW-02"].flatMap((id) => [
    [id, "pump-impeller", "离心叶轮"],
    [id, "pump-mechanical-seal", "机械密封"],
    [id, "pump-motor-stator", "电机定子"],
    [id, "pump-internal-flow", "泵内水流"],
  ]),
  ...["CT-01", "CT-02"].flatMap((id) => [
    [id, "spray-system", "热水布水"],
    [id, "fill-media", "PVC 填料"],
    [id, "drift-eliminator", "收水器"],
    [id, "basin-water", "冷水集水盘"],
    [id, "fan-rotor", "轴流风机"],
  ]),
  ["MAU-01", "intake-louver", "新风入口"],
  ["MAU-01", "pre-filter", "G4 / F8 两级过滤"],
  ["MAU-01", "cooling-coil", "表冷除湿盘管"],
  ["MAU-01", "heating-section", "再热盘管"],
  ["MAU-01", "humidifier", "蒸汽加湿"],
  ["MAU-01", "supply-fan", "送风机"],
  ["MAU-01", "supply-silencer", "消声段"],
  ["MAU-01", "outlet-section", "出风段"],
];

export function createUi({ store, sceneController }) {
  const equipmentPanel = document.querySelector("#equipment-panel");
  const panelTitle = document.querySelector("#equipment-title");
  const panelId = document.querySelector("#equipment-id");
  const panelStatus = document.querySelector("#equipment-status");
  const panelMetrics = document.querySelector("#equipment-metrics");
  const panelInternals = document.querySelector("#equipment-internals");
  const panelXray = document.querySelector("#panel-xray");
  const labelLayer = document.querySelector("#equipment-labels");
  const componentLayer = document.querySelector("#component-labels");
  const modeName = document.querySelector("#current-mode");
  const loading = document.querySelector("#loading-state");
  const toolbar = document.querySelector("#view-toolbar");
  const processRail = document.querySelector("#mau-process-rail");
  const hydronicLegend = document.querySelector("#hydronic-loop-legend");
  const controls = [...toolbar.querySelectorAll("button[data-action]")];
  const labels = createEquipmentLabels(labelLayer, store, sceneController);
  const componentLabels = createComponentLabels(componentLayer, sceneController);
  processRail.innerHTML = renderMauProcessMarkup();
  hydronicLegend.innerHTML = renderHydronicLoopsMarkup();

  createIcons({
    icons: { Box, Orbit, RotateCcw, Route, ScanLine, Tags, Wind, Workflow, X },
    attrs: { "stroke-width": 1.8, "aria-hidden": "true" },
  });

  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "mau") {
      store.setMode("mau");
      sceneController.focusEquipment("MAU-01");
    } else if (action === "overview") {
      store.selectEquipment(null);
      store.setMode("overview");
      if (!store.getState().pipesVisible) store.togglePipes();
      if (!store.getState().labelsVisible) store.toggleLabels();
      sceneController.resetView();
    } else if (action === "principle") {
      store.selectEquipment("CH-01");
      store.setMode("principle");
      if (store.getState().pipesVisible) store.togglePipes();
      sceneController.focusEquipment("CH-01");
    } else if (action === "xray") {
      const targetId = store.getState().selectedEquipmentId ?? "CH-01";
      store.selectEquipment(targetId);
      store.setXray(true);
      sceneController.focusEquipment(targetId);
    } else if (action === "tour") {
      store.toggleTour();
    } else if (action === "pipes") {
      store.togglePipes();
    } else if (action === "labels") {
      store.toggleLabels();
    } else if (action === "reset") {
      sceneController.resetView();
    }
  });

  document.querySelector("#panel-close").addEventListener("click", () => store.selectEquipment(null));
  panelXray.addEventListener("click", () => {
    const targetId = store.getState().selectedEquipmentId;
    if (!targetId) return;
    store.setXray(true);
    sceneController.focusEquipment(targetId);
  });

  return {
    render(state) {
      document.documentElement.dataset.mode = state.mode;
      modeName.textContent = modeLabel(state.mode);
      labelLayer.hidden = !state.labelsVisible;
      for (const button of controls) updateControl(button, state);
      for (const [id, label] of labels) {
        label.classList.toggle("is-selected", state.selectedEquipmentId === id);
        label.setAttribute("aria-pressed", String(state.selectedEquipmentId === id));
      }
      const componentTarget = state.mode === "mau" ? "MAU-01" : state.mode === "principle" ? "CH-01" : state.mode === "xray" ? state.selectedEquipmentId ?? "CH-01" : null;
      for (const item of componentLabels) item.element.hidden = item.equipmentId !== componentTarget;
      renderEquipmentPanel({ equipmentPanel, panelTitle, panelId, panelStatus, panelMetrics, panelInternals, panelXray }, state);
    },
    hideLoading() {
      loading.classList.add("is-hidden");
    },
    showError(message) {
      loading.classList.remove("is-hidden");
      loading.classList.add("has-error");
      loading.querySelector("strong").textContent = "3D 场景未能启动";
      loading.querySelector("span").textContent = message;
    },
  };
}

function createComponentLabels(container, sceneController) {
  return COMPONENT_LABELS.map(([equipmentId, componentName, labelText]) => {
    const element = document.createElement("span");
    element.className = "component-label";
    element.textContent = labelText;
    element.hidden = true;
    container.append(element);
    sceneController.registerComponentLabel(equipmentId, componentName, element);
    return { equipmentId, componentName, element };
  });
}

function createEquipmentLabels(container, store, sceneController) {
  const labels = new Map();
  for (const id of LABEL_IDS) {
    const equipment = getEquipmentById(id);
    if (!equipment) continue;
    const label = document.createElement("button");
    label.type = "button";
    label.className = "equipment-label";
    label.dataset.equipmentId = id;
    label.setAttribute("aria-label", `查看 ${equipment.name}`);
    label.innerHTML = `<span>${equipment.id}</span><strong>${equipment.shortName}</strong><small>${equipment.status} · ${equipment.load}%</small>`;
    label.addEventListener("click", () => {
      store.selectEquipment(id);
      sceneController.focusEquipment(id);
    });
    container.append(label);
    labels.set(id, label);
    sceneController.registerLabel(id, label);
  }
  return labels;
}

function updateControl(button, state) {
  const action = button.dataset.action;
  const active = isControlActive(action, state);
  button.classList.toggle("is-active", active);
  if (["mau", "overview", "principle", "xray", "tour", "pipes", "labels"].includes(action)) {
    button.setAttribute("aria-pressed", String(active));
  }
}

function renderEquipmentPanel(elements, state) {
  const equipment = getEquipmentById(state.selectedEquipmentId);
  elements.equipmentPanel.hidden = !equipment || state.mode === "mau" || state.mode === "xray";
  if (!equipment) return;
  elements.panelTitle.textContent = equipment.name;
  elements.panelId.textContent = equipment.id;
  elements.panelStatus.textContent = equipment.status;
  elements.panelStatus.dataset.status = equipment.status;
  elements.panelMetrics.replaceChildren(...equipment.metrics.map(createMetric));
  elements.panelInternals.replaceChildren(...equipment.internals.map(createInternal));
  elements.panelXray.classList.toggle("is-active", state.xrayEnabled);
  elements.panelXray.setAttribute("aria-pressed", String(state.xrayEnabled));
}

function createMetric(metric) {
  const row = document.createElement("div");
  const label = document.createElement("span");
  label.textContent = metric.label;
  const value = document.createElement("strong");
  value.textContent = `${metric.value}${metric.unit}`;
  row.append(label, value);
  return row;
}

function createInternal(name) {
  const item = document.createElement("li");
  item.textContent = name;
  return item;
}

function modeLabel(mode) {
  return { mau: "MAU 剖视", overview: "系统运行", principle: "制冷循环", xray: "设备透视" }[mode] ?? "系统运行";
}

export function isControlActive(action, state) {
  return (
    action === state.mode ||
    (action === "tour" && state.tourEnabled) ||
    (action === "pipes" && state.pipesVisible) ||
    (action === "labels" && state.labelsVisible)
  );
}

export function renderMauProcessMarkup(stages = MAU_PROCESS_STAGES) {
  const items = stages.map((stage) => `
    <li data-stage="${stage.id}" style="--stage-color: ${stage.color}">
      <span>${String(stage.index).padStart(2, "0")} · ${stage.code}</span>
      <strong>${stage.title}</strong>
      <small>${stage.detail}</small>
    </li>`).join("");

  return `
    <div class="process-rail-heading"><span>AIR PATH</span><strong>空气处理顺序</strong></div>
    <ol>${items}</ol>`;
}

export function renderHydronicLoopsMarkup(loops = HYDRONIC_LOOPS) {
  return loops.map((loop) => {
    const flow = loop.steps.map((step, index) => `
      <li class="loop-step" style="--step-color: ${step.color}">
        <span>${step.label}</span>
        <small>${step.detail}</small>
      </li>${index < loop.steps.length - 1 ? '<li class="loop-arrow" aria-hidden="true">›</li>' : ""}`).join("");

    return `
      <section class="hydronic-loop" data-loop="${loop.id}">
        <header><span>${loop.code}</span><strong>${loop.title}</strong><small>${loop.detail}</small></header>
        <ol>${flow}</ol>
      </section>`;
  }).join("");
}
