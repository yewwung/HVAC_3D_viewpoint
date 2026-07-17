---
author: yewwung
author_email: yewwung@163.com
creator: yewwung
lastModifiedBy: yewwung
---

# MAU 直驱 EC 插入式离心风机实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 将 MAU-01 的轴流花瓣状风机重建为轴线与风向一致、结构和气流原理正确的直驱 EC 插入式离心风机。

**架构：** `src/scene/equipment/mau.js` 继续负责 MAU 风机几何与 84 个空气粒子的路径数据；`src/scene/create-plant-model.js` 统一驱动直线和曲线路径粒子。风机保持现有根节点与转子动画接口，仅替换内部结构，并在场景层调整 MAU 镜头为上游侧三分之四视角。

**技术栈：** Three.js、Vite、Node 内置测试运行器、Playwright CLI。

---

## 文件职责

- 修改 `src/scene/equipment/mau.js`：构建插入式离心风机、生成后弯叶轮和 MAU 曲线气流路径。
- 修改 `src/scene/create-plant-model.js`：沿曲线更新空气粒子的位置与朝向。
- 修改 `src/scene/create-showcase-scene.js`：将 MAU 镜头偏向风机上游侧。
- 修改 `src/app/create-ui.js`：把组件标签改为“EC 插入式离心风机”。
- 修改 `tests/equipment.test.js`：验证几何、轴线、上下游关系和离心气流路径。
- 修改 `tests/plant-scene.test.js`：验证统一动画循环会驱动曲线路径粒子。
- 修改 `README.md`：记录直驱 EC 风机和轴向吸入/径向排出动画。
- 更新 `docs/hvac-showcase-desktop.png`、`docs/hvac-showcase-mobile.png`：保存最终真实浏览器画面和作者元数据。

### 任务 1：用 TDD 重建直驱 EC 插入式离心风机

**文件：**
- 修改：`tests/equipment.test.js`
- 修改：`src/scene/equipment/mau.js`

- [ ] **步骤 1：替换旧风机断言，编写失败测试**

在 `tests/equipment.test.js` 中保留盘管正交断言，并将风机部分改为：

```js
test("MAU uses an inline EC backward-curved centrifugal plug fan", () => {
  const mau = buildMau({ id: "MAU-01" });
  const fan = mau.getObjectByName("supply-fan");
  const rotor = mau.getObjectByName("supply-fan-rotor");
  const blades = rotor.children.filter((child) => child.name.startsWith("supply-fan-blade-"));

  for (const name of [
    "supply-fan-inlet-panel",
    "supply-fan-inlet-cone",
    "supply-fan-front-shroud",
    "supply-fan-rear-disc",
    "supply-fan-drive-motor",
    "supply-fan-support-frame",
  ]) assert.ok(mau.getObjectByName(name), `${name} should exist`);

  for (let index = 1; index <= 4; index += 1) {
    assert.ok(mau.getObjectByName(`supply-fan-isolator-${index}`));
  }

  assert.equal(blades.length, 7);
  for (const blade of blades) {
    blade.geometry.computeBoundingBox();
    const size = blade.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.equal(blade.geometry.type, "ExtrudeGeometry");
    assert.ok(size.z >= 0.2, `${blade.name} should have axial depth`);
  }

  const axis = new THREE.Vector3(0, 0, 1).applyQuaternion(fan.quaternion).normalize();
  assert.ok(Math.abs(axis.x) > 0.999);
  assert.ok(Math.abs(axis.y) < 1e-8);
  assert.ok(Math.abs(axis.z) < 1e-8);

  mau.updateMatrixWorld(true);
  const inletX = mau.getObjectByName("supply-fan-inlet-cone").getWorldPosition(new THREE.Vector3()).x;
  const motorX = mau.getObjectByName("supply-fan-drive-motor").getWorldPosition(new THREE.Vector3()).x;
  assert.ok(inletX < motorX, "inlet should be upstream of the motor");
  assert.equal(mau.getObjectByName("supply-fan-hub"), undefined);
});
```

同时删除旧的 `supply-fan-casing`、九片叶片和正面轮毂断言，并在文件顶部增加 `import * as THREE from "three";`。

- [ ] **步骤 2：运行测试验证红灯**

运行：

```powershell
npm test -- tests/equipment.test.js
```

预期：FAIL，缺少 `supply-fan-inlet-panel`，且旧模型叶片数为 9。

- [ ] **步骤 3：实现风机几何**

在 `src/scene/equipment/mau.js` 中增加环形挤出辅助函数：

```js
function createAnnularGeometry(outerRadius, innerRadius, depth) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.01,
    bevelThickness: 0.01,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}
```

将 `createSupplyFan()` 重写为以下结构：

```js
function createSupplyFan(materials) {
  const group = new THREE.Group();
  group.name = "supply-fan";
  group.rotation.y = -Math.PI / 2;

  const steel = standard(0x9fb2b5, { roughness: 0.38, metalness: 0.58 });
  const wheel = standard(0x397f8b, { roughness: 0.26, metalness: 0.68, emissive: 0x164d57, emissiveIntensity: 0.12 });
  const shroud = physical(0x8bb7bd, { roughness: 0.22, metalness: 0.46, transparent: true, opacity: 0.56 });
  const frameMaterial = standard(0x4a5b5e, { roughness: 0.48, metalness: 0.64 });

  const inletPanel = new THREE.Group();
  inletPanel.name = "supply-fan-inlet-panel";
  inletPanel.position.z = 0.34;
  inletPanel.add(box([1.3, 0.16, 0.07], steel, { position: [0, 0.57, 0], name: "supply-fan-panel-top" }));
  inletPanel.add(box([1.3, 0.16, 0.07], steel, { position: [0, -0.57, 0], name: "supply-fan-panel-bottom" }));
  inletPanel.add(box([0.16, 0.98, 0.07], steel, { position: [-0.57, 0, 0], name: "supply-fan-panel-left" }));
  inletPanel.add(box([0.16, 0.98, 0.07], steel, { position: [0.57, 0, 0], name: "supply-fan-panel-right" }));
  group.add(inletPanel);

  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.2, 48, 1, true), steel);
  cone.name = "supply-fan-inlet-cone";
  cone.position.z = 0.24;
  cone.rotation.x = Math.PI / 2;
  cone.castShadow = true;
  group.add(cone);

  const rotor = new THREE.Group();
  rotor.name = "supply-fan-rotor";
  const frontShroud = new THREE.Mesh(createAnnularGeometry(0.5, 0.2, 0.055), shroud);
  frontShroud.name = "supply-fan-front-shroud";
  frontShroud.position.z = 0.13;
  rotor.add(frontShroud);
  rotor.add(cylinder(0.48, 0.055, wheel, { position: [0, 0, -0.15], rotation: [Math.PI / 2, 0, 0], segments: 48, name: "supply-fan-rear-disc" }));

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0.2, -0.035);
  bladeShape.quadraticCurveTo(0.32, -0.15, 0.48, -0.085);
  bladeShape.lineTo(0.47, 0.02);
  bladeShape.quadraticCurveTo(0.33, -0.035, 0.21, 0.065);
  bladeShape.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.24,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.009,
    bevelThickness: 0.009,
  });
  bladeGeometry.translate(0, 0, -0.13);
  for (let index = 0; index < 7; index += 1) {
    const blade = new THREE.Mesh(bladeGeometry, wheel);
    blade.name = `supply-fan-blade-${index + 1}`;
    blade.rotation.z = (index * Math.PI * 2) / 7 + 0.12;
    blade.castShadow = true;
    rotor.add(blade);
  }
  group.add(rotor);

  const motor = new THREE.Group();
  motor.name = "supply-fan-drive-motor";
  motor.position.z = -0.4;
  motor.add(cylinder(0.21, 0.34, materials.industrialBlue, { rotation: [Math.PI / 2, 0, 0], segments: 32, name: "supply-fan-motor-body" }));
  motor.add(cylinder(0.07, 0.26, materials.chrome, { position: [0, 0, 0.22], rotation: [Math.PI / 2, 0, 0], segments: 20, name: "supply-fan-motor-shaft" }));
  for (let z = -0.12; z <= 0.12; z += 0.06) {
    const fin = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.012, 8, 32), frameMaterial);
    fin.position.z = z;
    fin.name = `supply-fan-motor-fin-${z}`;
    motor.add(fin);
  }
  group.add(motor);

  const frame = new THREE.Group();
  frame.name = "supply-fan-support-frame";
  frame.add(box([1.12, 0.07, 0.07], frameMaterial, { position: [0, -0.62, -0.08], name: "supply-fan-frame-base" }));
  for (const x of [-0.48, 0.48]) {
    frame.add(box([0.07, 0.78, 0.07], frameMaterial, { position: [x, -0.25, -0.08], name: `supply-fan-frame-leg-${x}` }));
  }
  group.add(frame);

  const isolatorMaterial = standard(0x202a2c, { roughness: 0.72, metalness: 0.28 });
  [[-0.46, -0.68, 0.24], [0.46, -0.68, 0.24], [-0.46, -0.68, -0.3], [0.46, -0.68, -0.3]].forEach((position, index) => {
    group.add(cylinder(0.055, 0.08, isolatorMaterial, { position, segments: 16, name: `supply-fan-isolator-${index + 1}` }));
  });

  return group;
}
```

- [ ] **步骤 4：运行设备测试验证绿灯**

运行：

```powershell
npm test -- tests/equipment.test.js
```

预期：设备测试全部 PASS。

- [ ] **步骤 5：提交任务 1**

```powershell
git add tests/equipment.test.js src/scene/equipment/mau.js
git commit -m "feat: 重建 MAU EC 离心风机（任务 1/4）"
```

### 任务 2：让主气流在风机段轴向收敛并径向扩散

**文件：**
- 修改：`tests/equipment.test.js`
- 修改：`tests/plant-scene.test.js`
- 修改：`src/scene/equipment/mau.js`
- 修改：`src/scene/create-plant-model.js`

- [ ] **步骤 1：编写曲线路径失败测试**

在 `tests/equipment.test.js` 增加：

```js
test("MAU airflow turns through the centrifugal fan before plenum recovery", () => {
  const mau = buildMau({ id: "MAU-01" });
  const paths = mau.userData.animation.airflow.filter((item) => item.curve);
  assert.ok(paths.length >= 60);
  assert.deepEqual(mau.userData.fanAirflowStages, ["axial-intake", "radial-discharge", "plenum-recovery"]);

  const [beforeEye, eye, radial, recovered] = [1, 2, 3, 4].map((index) => paths[0].curve.points[index]);
  const eyeRadius = Math.hypot(eye.y - 1.02, eye.z);
  const radialRadius = Math.hypot(radial.y - 1.02, radial.z);
  assert.ok(beforeEye.x < eye.x);
  assert.ok(radialRadius > eyeRadius + 0.2);
  assert.ok(recovered.x > radial.x);
});
```

在 `tests/plant-scene.test.js` 导入 `updatePlantModel` 并增加：

```js
test("plant animation advances MAU airflow along its curve", () => {
  const model = createPlantModel();
  const particle = model.animation.airflow.find((item) => item.curve);
  const before = particle.mesh.position.clone();
  updatePlantModel(model, 0.016, 1.5);
  assert.notDeepEqual(particle.mesh.position.toArray(), before.toArray());
});
```

- [ ] **步骤 2：运行目标测试验证红灯**

运行：

```powershell
npm test -- tests/equipment.test.js tests/plant-scene.test.js
```

预期：FAIL，当前空气动画项没有 `curve`，也没有 `fanAirflowStages`。

- [ ] **步骤 3：为每个 MAU 空气粒子创建物理路径**

在 `src/scene/equipment/mau.js` 增加：

```js
function createMauAirflowCurve(laneY, laneZ, index) {
  const angle = (index * Math.PI * 2) / 7;
  const radialY = Math.cos(angle) * 0.46;
  const radialZ = Math.sin(angle) * 0.46;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.04, laneY, laneZ),
    new THREE.Vector3(0.76, laneY, laneZ),
    new THREE.Vector3(1.05, 1.02 + (laneY - 1.02) * 0.12, laneZ * 0.12),
    new THREE.Vector3(1.24, 1.02 + radialY, radialZ),
    new THREE.Vector3(1.62, laneY, laneZ),
    new THREE.Vector3(3.04, laneY, laneZ),
  ], false, "catmullrom", 0.08);
}
```

创建粒子时移除固定 `rotation.z`，将 `curve` 写入动画项并用初始相位设置位置：

```js
const curve = createMauAirflowCurve(laneY, laneZ, index);
const phase = index / AIRFLOW_PARTICLE_COUNT;
particle.position.copy(curve.getPointAt(phase));
airflow.push({
  mesh: particle,
  curve,
  phase,
  speed: 0.075 + (index % 7) * 0.003,
  colorZones: [-1.56, -0.82, -0.16],
  materials: airMaterials,
});
```

在 `buildMau()` 返回前写入：

```js
group.userData.fanAirflowStages = ["axial-intake", "radial-discharge", "plenum-recovery"];
```

- [ ] **步骤 4：统一更新曲线空气粒子的位置和朝向**

在 `src/scene/create-plant-model.js` 的空气循环中，用以下分支替换直线位置更新：

```js
if (item.curve) {
  const point = Number.isFinite(t) ? item.curve.getPointAt(t) : null;
  if (!point) continue;
  item.mesh.position.copy(point);
  const tangent = item.curve.getTangentAt(t, new THREE.Vector3()).normalize();
  item.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
} else if (item.minX !== undefined) {
  item.mesh.position.x = THREE.MathUtils.lerp(item.minX, item.maxX, t);
} else {
  item.mesh.position.y = THREE.MathUtils.lerp(item.minY, item.maxY, t);
}
```

颜色分区和脉冲逻辑保持在该分支之后，继续读取粒子的实际 X 坐标。

- [ ] **步骤 5：运行目标测试验证绿灯**

```powershell
npm test -- tests/equipment.test.js tests/plant-scene.test.js
```

预期：目标测试全部 PASS。

- [ ] **步骤 6：提交任务 2**

```powershell
git add tests/equipment.test.js tests/plant-scene.test.js src/scene/equipment/mau.js src/scene/create-plant-model.js
git commit -m "feat: 呈现离心风机气流转向（任务 2/4）"
```

### 任务 3：调整 MAU 镜头、标签和说明

**文件：**
- 修改：`src/scene/create-showcase-scene.js`
- 修改：`src/app/create-ui.js`
- 修改：`README.md`

- [ ] **步骤 1：调整 MAU 镜头方向**

将 `focusEquipment()` 中 MAU 方向改为：

```js
const direction = equipmentId === "MAU-01"
  ? new THREE.Vector3(-0.18, 0.24, 1.0).normalize()
  : new THREE.Vector3(1.15, 0.62, 1.25).normalize();
```

- [ ] **步骤 2：更新组件标签和 README**

将 MAU 风机标签改为：

```js
["MAU-01", "supply-fan", "EC 插入式离心风机"],
```

README 的 MAU 能力说明明确写出“轴向吸入、后弯叶轮径向排出、静压箱汇流”和直驱 EC 电机。

- [ ] **步骤 3：运行完整测试和构建**

```powershell
npm test
npm run build
```

预期：全部测试 PASS，Vite 构建退出码为 0。

- [ ] **步骤 4：提交任务 3**

```powershell
git add src/scene/create-showcase-scene.js src/app/create-ui.js README.md
git commit -m "docs: 更新 MAU 离心风机视图说明（任务 3/4）"
```

### 任务 4：真实浏览器验收、截图与交付

**文件：**
- 更新：`docs/hvac-showcase-desktop.png`
- 更新：`docs/hvac-showcase-mobile.png`

- [ ] **步骤 1：确认 Playwright 前置条件和本地服务**

```powershell
Get-Command npx
npm run dev
```

如果 5173 已被本项目占用，复用该服务；否则使用 Vite 输出的新端口。

- [ ] **步骤 2：桌面验收**

使用 Playwright CLI 在 1440×900 打开 MAU 默认模式，取得 fresh snapshot 后检查：进风锥、深筒七叶后弯叶轮、后置 EC 电机、支撑架和减振件可辨认；局部粒子在风机段发生径向转向；页面无横向溢出、控制台 0 错误/0 警告。

- [ ] **步骤 3：移动端验收**

将视口设为 390×844 后重新加载，使移动端镜头重新初始化。确认整台 MAU 完整入镜、风机仍能辨认、HUD 与工具栏不遮挡设备、页面宽度等于 390px。

- [ ] **步骤 4：画布像素检查和截图**

截图 `#scene-canvas`，用 `System.Drawing.Bitmap` 抽样，要求亮度样本和彩色样本均大于 0。保存桌面和移动端页面截图到 `docs/`，然后运行：

```powershell
node scripts/set-png-author.mjs docs/hvac-showcase-desktop.png docs/hvac-showcase-mobile.png
```

要求 `Author`、`Creator`、`LastModifiedBy` 为 `yewwung`，`AuthorEmail` 为 `yewwung@163.com`。

- [ ] **步骤 5：最终验证**

```powershell
npm test
npm run build
git diff --check
git diff --name-only -- original
```

预期：测试和构建通过、diff 检查无错误、`original/` 无输出。

- [ ] **步骤 6：提交任务 4、快进合并并推送**

```powershell
git add docs/hvac-showcase-desktop.png docs/hvac-showcase-mobile.png
git commit -m "docs: 更新 MAU EC 风机展示截图（任务 4/4）"
git switch main
git merge --ff-only fix/mau-ec-plug-fan
git push origin main
```

