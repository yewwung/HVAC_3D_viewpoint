---
author: yewwung
author_email: yewwung@163.com
lastModifiedBy: yewwung
---

# HVAC 沉浸式 3D 展示版实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 构建以高保真螺杆式冷水机组为视觉中心、带真实水路和设备运行动画的可嵌入 Three.js 展示页。

**架构：** `src/data` 保存无渲染依赖的设备和水路配置，`src/scene` 负责 Three.js 建模与动画，`src/app` 管理模式状态、选中设备和公开 API。DOM 入口订阅状态并同步工具栏和检查面板，避免 3D 模型与界面直接耦合。

**技术栈：** Three.js、Vite、Lucide、Node 内置测试运行器、Playwright CLI。

---

### 任务 1：保留初始版本并建立测试入口

**文件：**
- 创建：`original/` 初始版本快照
- 修改：`package.json`
- 创建：`tests/showcase-state.test.js`

- [ ] 复制初始提交的入口、源码、文档、锁文件和截图到 `original/`。
- [ ] 在 `package.json` 设置作者 `yewwung <yewwung@163.com>`，增加 `test` 脚本并添加 Lucide 依赖。
- [ ] 编写状态测试，断言初始模式为 `overview`、巡航开启、管网和标签可见、透视关闭，并验证 `overview`、`principle`、`xray` 三种模式及无效模式处理。
- [ ] 运行 `npm test`，确认因 `src/app/showcase-state.js` 缺失而失败。

### 任务 2：实现可测试的展示状态与系统数据

**文件：**
- 创建：`src/app/showcase-state.js`
- 创建：`src/data/plant-data.js`
- 创建：`tests/plant-data.test.js`

- [ ] 实现 `createShowcaseState()`，提供 `subscribe`、`setMode`、`setXray`、`toggleTour`、`togglePipes`、`toggleLabels`、`selectEquipment` 和 `getState`。
- [ ] 运行状态测试并确认通过。
- [ ] 编写系统数据测试，断言四条水路方向、冷水机组四个制冷阶段，以及 CH-01、P-CHW-01、P-CW-01、CT-01、MAU-01 五类关键设备存在。
- [ ] 运行数据测试，确认因系统数据未导出而失败；随后实现确定性设备清单和水路配置并确认全部通过。

### 任务 3：建立 3D 建模基础与高保真冷水机组

**文件：**
- 创建：`src/scene/materials.js`
- 创建：`src/scene/primitives.js`
- 创建：`src/scene/equipment/chiller.js`
- 创建：`tests/chiller.test.js`

- [ ] 编写冷水机组结构测试，要求返回命名为 `CH-01` 的 Group，并包含 `evaporator-shell`、`evaporator-tube-bundle`、`condenser-shell`、`condenser-tube-bundle`、`compressor`、`control-cabinet`、`refrigerant-loop` 和两个 `screw-rotor` 节点，同时将外壳与内部件分别登记到 `userData.shells` 和 `userData.internals`。
- [ ] 运行测试，确认因构建器缺失而失败。
- [ ] 实现可复用法兰、表计、弯管、圆角柜体和设备铭牌原语；按参考图比例创建双壳管换热器、控制柜、压缩机、管件与底座。
- [ ] 运行冷水机组测试和完整测试集，确认通过。

### 任务 4：创建全厂设备、管网与运行动画

**文件：**
- 创建：`src/scene/equipment/pump.js`
- 创建：`src/scene/equipment/cooling-tower.js`
- 创建：`src/scene/equipment/mau.js`
- 创建：`src/scene/flow-system.js`
- 创建：`src/scene/create-plant-scene.js`

- [ ] 创建立式端吸泵、矩形横流冷却塔、MAU、分集水器和机房基础；泵包含叶轮与内部水流，冷却塔包含布水、填料、水滴和气流，MAU 包含新风入口、初效过滤器、冷却盘管、加热段、加湿段、送风机和出风段，所有可选设备写入 `userData.equipmentId`。
- [ ] 根据 `plant-data.js` 构建四类分色管网，使用共享粒子几何沿曲线按正确方向循环。
- [ ] 在统一 `update(delta, elapsed, state)` 中驱动水流、泵联轴器、冷却塔风机、螺杆转子、状态灯和巡航镜头。
- [ ] 运行 `npm test` 与 `npm run build`，确认数据与 Three.js 模块可被打包。

### 任务 5：实现展示界面和嵌入 API

**文件：**
- 修改：`index.html`
- 修改：`styles.css`
- 重写：`src/main.js`
- 创建：`src/app/create-ui.js`
- 创建：`tests/public-api.test.js`

- [ ] 编写公开 API 测试，要求 `createShowcaseApi()` 暴露 `setMode`、`focusEquipment`、`setXray`、`resetView` 与 `getState`。
- [ ] 运行测试，确认因 API 缺失而失败；实现薄包装 API 并确认通过。
- [ ] 构建全屏画布、顶部状态栏、底部 Lucide 图标控制栏、管线图例、局部流量数据标签、设备检查面板和加载状态。
- [ ] 将状态订阅连接到 Three.js 场景和 DOM，把 API 挂到 `window.HVACShowcase`。
- [ ] 完成桌面、平板和移动端 CSS，加入焦点样式与 reduced-motion 规则。

### 任务 6：浏览器验收与交付

**文件：**
- 更新：`README.md`
- 创建：`docs/hvac-showcase-desktop.png`
- 创建：`docs/hvac-showcase-mobile.png`

- [ ] 运行 `npm test`，要求所有测试通过且无警告。
- [ ] 运行 `npm run build`，要求退出码为 0。
- [ ] 启动 Vite，用 Playwright CLI 在 1440x900 和 390x844 视口检查 WebGL 非空、无溢出，并执行巡航、原理模式、设备透视、管网、设备点选和重置操作。
- [ ] 保存桌面与移动端截图，写入作者元数据 `yewwung`，更新 README 的功能、目录、嵌入 API 与预览。
- [ ] 检查 `git diff --check`、提交功能分支、合并到 `main` 并通过 SSH 推送到 `origin/main`。
