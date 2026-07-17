export function createShowcaseApi(store, actions = {}) {
  return Object.freeze({
    setMode(mode) {
      return store.setMode(mode);
    },
    focusEquipment(equipmentId) {
      store.selectEquipment(equipmentId);
      actions.focusEquipment?.(equipmentId);
    },
    setXray(enabled) {
      store.setXray(enabled);
    },
    resetView() {
      actions.resetView?.();
    },
    getState() {
      return store.getState();
    },
  });
}
