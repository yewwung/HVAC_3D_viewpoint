import "../styles.css";

import { createShowcaseApi } from "./app/showcase-api.js";
import { createShowcaseState } from "./app/showcase-state.js";
import { createUi } from "./app/create-ui.js";
import { createShowcaseScene } from "./scene/create-showcase-scene.js";

const store = createShowcaseState();
let ui;

try {
  const sceneController = createShowcaseScene({
    canvas: document.querySelector("#scene-canvas"),
    onEquipmentSelect(equipmentId) {
      store.selectEquipment(equipmentId);
    },
    onTourInterrupt() {
      if (store.getState().tourEnabled) store.toggleTour();
    },
  });

  ui = createUi({ store, sceneController });
  store.subscribe((state) => {
    sceneController.setPresentation(state);
    ui.render(state);
  });
  sceneController.setPresentation(store.getState());
  ui.render(store.getState());

  const api = createShowcaseApi(store, {
    focusEquipment: sceneController.focusEquipment,
    resetView: sceneController.resetView,
  });
  window.HVACShowcase = api;
  window.addEventListener("load", () => window.setTimeout(() => ui.hideLoading(), 220));
  window.addEventListener("beforeunload", () => sceneController.dispose(), { once: true });
} catch (error) {
  console.error(error);
  document.querySelector("#loading-state")?.classList.add("has-error");
  const title = document.querySelector("#loading-state strong");
  const detail = document.querySelector("#loading-state span");
  if (title) title.textContent = "3D 场景未能启动";
  if (detail) detail.textContent = error instanceof Error ? error.message : "未知渲染错误";
}
