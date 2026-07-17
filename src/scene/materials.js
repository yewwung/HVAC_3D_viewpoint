import * as THREE from "three";

export const COLORS = Object.freeze({
  graphite: 0x172126,
  darkMetal: 0x263238,
  industrialBlue: 0x123b64,
  industrialBlueDark: 0x0b2542,
  cabinet: 0xd9ddda,
  cabinetEdge: 0xaab3b1,
  steel: 0x8e9b9c,
  chrome: 0xb8c5c6,
  rubber: 0x151b1e,
  copper: 0xb96f3a,
  brass: 0xc9a25e,
  chilledSupply: 0x27b7ff,
  chilledReturn: 0x3d63c8,
  coolingSupply: 0x1fc7a5,
  coolingReturn: 0xff8b3d,
  refrigerantHot: 0xff6547,
  refrigerantLiquid: 0xffb23f,
  refrigerantExpansion: 0xa98bff,
  refrigerantCold: 0x2ac7ff,
});

export function createMaterialLibrary() {
  return {
    industrialBlue: standard(COLORS.industrialBlue, { roughness: 0.27, metalness: 0.62 }),
    industrialBlueShell: physical(COLORS.industrialBlue, { roughness: 0.24, metalness: 0.58, transparent: true, opacity: 0.96 }),
    darkBlue: standard(COLORS.industrialBlueDark, { roughness: 0.26, metalness: 0.7 }),
    cabinet: standard(COLORS.cabinet, { roughness: 0.36, metalness: 0.55 }),
    cabinetShell: physical(COLORS.cabinet, { roughness: 0.34, metalness: 0.5, transparent: true, opacity: 0.98 }),
    cabinetEdge: standard(COLORS.cabinetEdge, { roughness: 0.32, metalness: 0.58 }),
    steel: standard(COLORS.steel, { roughness: 0.3, metalness: 0.72 }),
    chrome: standard(COLORS.chrome, { roughness: 0.18, metalness: 0.88 }),
    darkMetal: standard(COLORS.darkMetal, { roughness: 0.29, metalness: 0.72 }),
    rubber: standard(COLORS.rubber, { roughness: 0.66, metalness: 0.06 }),
    copper: standard(COLORS.copper, { roughness: 0.28, metalness: 0.7 }),
    brass: standard(COLORS.brass, { roughness: 0.24, metalness: 0.74 }),
    glass: physical(0x8edcff, { roughness: 0.08, metalness: 0.06, transparent: true, opacity: 0.34, transmission: 0.2 }),
    screen: standard(0x092637, { roughness: 0.18, metalness: 0.2, emissive: 0x148fc4, emissiveIntensity: 0.55 }),
    whiteGlow: standard(0xffffff, { roughness: 0.24, metalness: 0.12, emissive: 0x9eeeff, emissiveIntensity: 0.35 }),
  };
}

export function standard(color, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.42,
    metalness: options.metalness ?? 0.2,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide,
  });
  material.userData.baseOpacity = material.opacity;
  material.userData.baseTransparent = material.transparent;
  return material;
}

export function physical(color, options = {}) {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness ?? 0.26,
    metalness: options.metalness ?? 0.34,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    transmission: options.transmission ?? 0,
    clearcoat: options.clearcoat ?? 0.18,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.22,
    side: options.side ?? THREE.FrontSide,
  });
  material.userData.baseOpacity = material.opacity;
  material.userData.baseTransparent = material.transparent;
  return material;
}

export function emissive(color, intensity = 0.7) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94, toneMapped: false });
}
