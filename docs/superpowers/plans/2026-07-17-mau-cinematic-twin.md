---
author: yewwung
author_email: yewwung@163.com
lastModifiedBy: yewwung
---

# MAU 电影化剖视数字孪生实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将默认首屏升级为参考图一视觉语言的 MAU-01 电影化 3D 剖视数字孪生，同时保留现有全厂视图和可嵌入 API。

**架构：** 在现有状态机中增加独立 `mau` 模式，由场景展示层统一隔离设备、地面和管网；MAU 构建器负责功能段、阀组、光区和可测试的动画注册。DOM UI 只订阅状态并显示 MAU 工况 HUD，未来可将构建器替换为 Blender 导出的 GLB，而不改变状态或嵌入 API。

**技术栈：** Three.js、Vite、Lucide、Node 内置测试运行器、Playwright CLI。

---

### 任务 1：锁定 MAU 默认模式行为

**文件：**
- 修改：`tests/showcase-state.test.js`
- 修改：`tests/plant-scene.test.js`
- 修改：`src/app/showcase-state.js`
- 修改：`src/scene/create-plant-model.js`

- [ ] 修改状态测试，断言初始状态为 `mode: "mau"`、巡航/管网/标签关闭、透视开启并自动选择 `MAU-01`。
- [ ] 修改展示测试，断言 `mau` 模式只显示 MAU-01，隐藏 CH-01、全厂管网、地面和网格，并启用 MAU 透视。
- [ ] 运行 `npm test -- tests/showcase-state.test.js tests/plant-scene.test.js`，确认因缺少 `mau` 模式与隔离规则而失败。
- [ ] 将 `SHOWCASE_MODES` 改为 `["mau", "overview", "principle", "xray"]`，并让 `setMode("mau")` 恢复 MAU 默认选择和可见性。
- [ ] 给地面和网格保存显式引用，由 `setPlantPresentation()` 根据 `mau` 模式切换，而不是销毁对象。
- [ ] 重新运行目标测试，确认通过。

### 任务 2：构建可读的 MAU 内部与水力阀组

**文件：**
- 修改：`tests/equipment.test.js`
- 修改：`src/scene/equipment/mau.js`
- 修改：`src/scene/create-plant-model.js`

- [ ] 扩展 MAU 结构测试，要求 `airflow-warm-zone`、`airflow-cool-zone`、`mau-hydronic-controls`、`mau-chws-control-valve`、`mau-chwr-balancing-valve` 存在，气流粒子不少于 60 个，设备内部水路径不少于 4 条。
- [ ] 运行 `npm test -- tests/equipment.test.js`，确认新增断言按预期失败。
- [ ] 在 MAU 构建器中增加半透明功能舱光区、盘管下方 CHWS/CHWR 外露支管、控制阀、平衡阀、执行器、表计和法兰。
- [ ] 将气流注册为包含 `warm`、`cool`、`supply` 三段的动画数据；将盘管和阀组水路注册为至少四条曲线。
- [ ] 在统一动画更新中按粒子在设备内的位置切换红、蓝、青三种颜色，同时驱动阀组水粒子。
- [ ] 重新运行设备测试和完整测试集，确认通过且无警告。

### 任务 3：实现 MAU 专属镜头与视觉照明

**文件：**
- 修改：`src/scene/create-showcase-scene.js`

- [ ] 增加桌面和移动端 MAU 镜头预设，使设备主体约占有效视口 70%，镜头略高并正对打开的检修侧。
- [ ] `setPresentation()` 首次进入或切换到 `mau` 时调用 `focusEquipment("MAU-01")`，重置按钮在该模式回到 MAU 镜头，而全景模式回到全厂镜头。
- [ ] 将背景改为 `#07111d`，增加服务于 MAU 剖视的冷白轮廓光、红色入口光和蓝色盘管光；全景模式仍使用现有可读照明。
- [ ] 限制 OrbitControls 的最小/最大距离，保证桌面和移动端不会轻易把设备缩成小模型或穿进外壳。
- [ ] 运行 `npm run build`，确认 Three.js 场景模块可打包。

### 任务 4：重构首屏 HUD 与控制栏

**文件：**
- 修改：`index.html`
- 修改：`styles.css`
- 修改：`src/app/create-ui.js`

- [ ] 在标记中加入 MAU 工况 HUD，使用温湿度、压差、阀位、送风温度、风量和风机状态的真实语义字段。
- [ ] 在工具栏增加“MAU 剖视”图标按钮，将“系统全景”保留为独立按钮；`createUi()` 连接 `mau` 动作和当前模式状态。
- [ ] MAU 模式默认隐藏通用设备面板、管线图例和普通标签，只显示内部组件标签与专属 HUD；全景、原理和普通透视模式保持原行为。
- [ ] 使用午夜蓝、冷钢、冰蓝、热红、运行绿和阀门洋红重写首屏层级；桌面端左右两列数据不遮挡设备，390px 宽度时折叠为顶部状态带和底部紧凑控制栏。
- [ ] 为按钮保留键盘焦点、可读标签和 reduced-motion 行为。

### 任务 5：真实浏览器验收与交付

**文件：**
- 更新：`docs/hvac-showcase-desktop.png`
- 更新：`docs/hvac-showcase-mobile.png`
- 更新：`README.md`

- [ ] 运行 `npm test`，确认所有测试通过且输出无警告。
- [ ] 运行 `npm run build`，确认退出码为 0。
- [ ] 确认 `npx` 可用，启动 Vite，并用 Playwright CLI 在 1440x900 和 390x844 下检查控制、横向溢出、控制台、WebGL 非空和画布像素。
- [ ] 截取默认 MAU 模式及系统全景，逐张检查设备占比、组件遮挡、冷热粒子可见性、阀组可见性和移动端文本溢出；发现问题后修改并重新验收。
- [ ] 使用 `node scripts/set-png-author.mjs` 将截图作者写为 `yewwung`，并验证 PNG 文本块。
- [ ] 运行 `git diff --check`，以 `yewwung <yewwung@163.com>` 提交，合并到 `main`，通过 SSH 推送到 `origin/main`。
