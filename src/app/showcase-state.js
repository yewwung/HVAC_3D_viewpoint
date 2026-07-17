export const SHOWCASE_MODES = Object.freeze(["overview", "principle", "xray"]);

const INITIAL_STATE = Object.freeze({
  mode: "overview",
  tourEnabled: true,
  pipesVisible: true,
  labelsVisible: true,
  xrayEnabled: false,
  selectedEquipmentId: null,
});

export function createShowcaseState(initialState = {}) {
  let state = freezeState({ ...INITIAL_STATE, ...initialState });
  const subscribers = new Set();

  function publish(nextState) {
    state = freezeState(nextState);
    subscribers.forEach((subscriber) => subscriber(state));
  }

  function update(patch) {
    publish({ ...state, ...patch });
  }

  return {
    getState: () => state,
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    setMode(mode) {
      if (!SHOWCASE_MODES.includes(mode)) return false;
      update({ mode, xrayEnabled: mode === "xray" });
      return true;
    },
    setXray(enabled) {
      update({
        xrayEnabled: Boolean(enabled),
        mode: enabled ? "xray" : state.mode === "xray" ? "overview" : state.mode,
      });
    },
    toggleTour() {
      update({ tourEnabled: !state.tourEnabled });
    },
    togglePipes() {
      update({ pipesVisible: !state.pipesVisible });
    },
    toggleLabels() {
      update({ labelsVisible: !state.labelsVisible });
    },
    selectEquipment(selectedEquipmentId) {
      update({ selectedEquipmentId: selectedEquipmentId || null });
    },
  };
}

function freezeState(state) {
  return Object.freeze({ ...state });
}
