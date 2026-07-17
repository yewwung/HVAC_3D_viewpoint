export function setEquipmentXray(equipment, enabled) {
  const materials = new Set();
  for (const shell of equipment.userData.shells ?? []) {
    shell.traverse((object) => {
      if (!object.isMesh) return;
      for (const material of asArray(object.material)) materials.add(material);
    });
  }

  for (const material of materials) {
    if (material.userData.xrayBaseOpacity === undefined) {
      material.userData.xrayBaseOpacity = material.opacity;
      material.userData.xrayBaseTransparent = material.transparent;
      material.userData.xrayBaseDepthWrite = material.depthWrite;
    }
    material.opacity = enabled ? 0.12 : material.userData.xrayBaseOpacity;
    material.transparent = enabled ? true : material.userData.xrayBaseTransparent;
    material.depthWrite = enabled ? false : material.userData.xrayBaseDepthWrite;
    material.needsUpdate = true;
  }

  for (const internal of equipment.userData.internals ?? []) {
    internal.visible = internal.userData.xrayOnly ? Boolean(enabled) : true;
    internal.traverse((object) => {
      if (object.isMesh) object.renderOrder = enabled ? 5 : 0;
    });
  }
  equipment.userData.xrayEnabled = Boolean(enabled);
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}
