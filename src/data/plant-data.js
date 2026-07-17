const metric = (label, value, unit) => Object.freeze({ label, value, unit });

export const EQUIPMENT = Object.freeze([
  {
    id: "CH-01",
    name: "螺杆式水冷冷水机组",
    shortName: "冷水机组",
    type: "screw-chiller",
    status: "运行",
    load: 72,
    position: [-1.1, 0.55, -0.35],
    internals: ["蒸发器管束", "冷凝器管束", "双螺杆转子", "膨胀阀", "制冷剂回路"],
    metrics: [
      metric("冷冻供水", "7.0", "°C"),
      metric("冷冻回水", "12.0", "°C"),
      metric("流量", "468", "m³/h"),
      metric("COP", "5.82", ""),
    ],
  },
  {
    id: "P-CHW-01",
    name: "一次冷冻水泵 1",
    shortName: "冷冻泵 1",
    type: "chilled-water-pump",
    status: "运行",
    load: 68,
    position: [-5.2, 0.15, 2.75],
    internals: ["叶轮", "机械密封", "联轴器", "电机转子"],
    metrics: [metric("频率", "42.6", "Hz"), metric("流量", "238", "m³/h"), metric("功率", "31.4", "kW")],
  },
  {
    id: "P-CHW-02",
    name: "一次冷冻水泵 2",
    shortName: "冷冻泵 2",
    type: "chilled-water-pump",
    status: "运行",
    load: 65,
    position: [-5.2, 0.15, 4.1],
    internals: ["叶轮", "机械密封", "联轴器", "电机转子"],
    metrics: [metric("频率", "40.8", "Hz"), metric("流量", "230", "m³/h"), metric("功率", "29.7", "kW")],
  },
  {
    id: "P-CW-01",
    name: "冷却水泵 1",
    shortName: "冷却泵 1",
    type: "cooling-water-pump",
    status: "运行",
    load: 74,
    position: [-5.2, 0.15, -4.15],
    internals: ["叶轮", "机械密封", "联轴器", "电机转子"],
    metrics: [metric("频率", "44.2", "Hz"), metric("流量", "286", "m³/h"), metric("功率", "36.8", "kW")],
  },
  {
    id: "P-CW-02",
    name: "冷却水泵 2",
    shortName: "冷却泵 2",
    type: "cooling-water-pump",
    status: "待机",
    load: 0,
    position: [-5.2, 0.15, -5.45],
    internals: ["叶轮", "机械密封", "联轴器", "电机转子"],
    metrics: [metric("频率", "0.0", "Hz"), metric("流量", "0", "m³/h"), metric("功率", "0.0", "kW")],
  },
  {
    id: "CT-01",
    name: "横流式冷却塔 1",
    shortName: "冷却塔 1",
    type: "crossflow-cooling-tower",
    status: "运行",
    load: 71,
    position: [2.1, 0.15, -5.65],
    internals: ["热水布水盘", "喷淋支管", "PVC 填料", "收水器", "冷水集水盘", "上升气流", "轴流风机"],
    metrics: [metric("进水", "32.0", "°C"), metric("出水", "27.0", "°C"), metric("风机", "36.5", "Hz")],
  },
  {
    id: "CT-02",
    name: "横流式冷却塔 2",
    shortName: "冷却塔 2",
    type: "crossflow-cooling-tower",
    status: "运行",
    load: 69,
    position: [5.0, 0.15, -5.65],
    internals: ["热水布水盘", "喷淋支管", "PVC 填料", "收水器", "冷水集水盘", "上升气流", "轴流风机"],
    metrics: [metric("进水", "31.8", "°C"), metric("出水", "27.1", "°C"), metric("风机", "35.8", "Hz")],
  },
  {
    id: "MAU-01",
    name: "组合式新风处理机组",
    shortName: "MAU 新风机组",
    type: "make-up-air-unit",
    status: "运行",
    load: 63,
    position: [5.25, 0.15, 0.45],
    internals: ["防雨百叶", "G4 初效过滤器", "F8 中效过滤器", "表冷除湿盘管", "再热盘管", "蒸汽加湿段", "送风机", "消声送风段"],
    metrics: [
      metric("新风温度", "30.4", "°C"),
      metric("新风湿度", "68", "%RH"),
      metric("盘管阀位", "63", "%"),
      metric("过滤压差", "86", "Pa"),
      metric("送风温度", "16.2", "°C"),
      metric("风量", "18200", "m³/h"),
    ],
  },
  {
    id: "HEADER-CHWS",
    name: "冷冻水分水器",
    shortName: "分水器",
    type: "water-header",
    status: "运行",
    load: 72,
    position: [2.25, 0.15, 3.0],
    internals: ["主管", "支管", "温度传感器", "差压传感器"],
    metrics: [metric("温度", "7.0", "°C"), metric("压力", "0.42", "MPa"), metric("流量", "468", "m³/h")],
  },
  {
    id: "HEADER-CHWR",
    name: "冷冻水集水器",
    shortName: "集水器",
    type: "water-header",
    status: "运行",
    load: 72,
    position: [2.25, 0.15, 4.55],
    internals: ["主管", "支管", "温度传感器", "差压传感器"],
    metrics: [metric("温度", "12.0", "°C"), metric("压力", "0.31", "MPa"), metric("流量", "468", "m³/h")],
  },
].map(Object.freeze));

export const WATER_CIRCUITS = Object.freeze([
  Object.freeze({ id: "chws", name: "冷冻供水", abbreviation: "CHWS", color: "#27b7ff", temperatureC: 7, flowM3h: 468, route: ["CH-01", "HEADER-CHWS", "MAU-01"] }),
  Object.freeze({ id: "chwr", name: "冷冻回水", abbreviation: "CHWR", color: "#3d63c8", temperatureC: 12, flowM3h: 468, route: ["MAU-01", "HEADER-CHWR", "P-CHW-01", "CH-01"] }),
  Object.freeze({ id: "cws", name: "冷却供水", abbreviation: "CWS", color: "#1fc7a5", temperatureC: 27, flowM3h: 572, route: ["CT-01", "P-CW-01", "CH-01"] }),
  Object.freeze({ id: "cwr", name: "冷却回水", abbreviation: "CWR", color: "#ff8b3d", temperatureC: 32, flowM3h: 572, route: ["CH-01", "CT-01"] }),
]);

export const MAU_PROCESS_STAGES = Object.freeze([
  Object.freeze({ id: "intake", index: 1, code: "OA", title: "进风", detail: "室外新风引入", color: "#ff4d52" }),
  Object.freeze({ id: "filtration", index: 2, code: "G4/F8", title: "两级过滤", detail: "拦截粗尘与细颗粒", color: "#d7e0df" }),
  Object.freeze({ id: "cooling", index: 3, code: "CC", title: "降温除湿", detail: "表冷盘管冷凝除湿", color: "#18c8ff" }),
  Object.freeze({ id: "reheat", index: 4, code: "RH", title: "再热调温", detail: "抬升干球温度防过冷", color: "#ff8b3d" }),
  Object.freeze({ id: "humidification", index: 5, code: "HUM", title: "蒸汽加湿", detail: "补充空气含湿量", color: "#55f1df" }),
  Object.freeze({ id: "fan", index: 6, code: "FAN", title: "风机增压", detail: "插入式风机克服阻力", color: "#45df8a" }),
  Object.freeze({ id: "silencer", index: 7, code: "SIL", title: "消声整流", detail: "降低噪声并稳定气流", color: "#9ab6bd" }),
  Object.freeze({ id: "supply", index: 8, code: "SA", title: "送风", detail: "16.2°C 处理空气送出", color: "#55f1df" }),
]);

const hydronicStep = (id, label, detail, color) => Object.freeze({ id, label, detail, color });

export const HYDRONIC_LOOPS = Object.freeze([
  Object.freeze({
    id: "chilled",
    code: "CHW",
    title: "冷冻水闭环",
    detail: "从末端回水，经蒸发器降温后返回 MAU",
    steps: Object.freeze([
      hydronicStep("chwr", "CHWR", "12°C 回水", "#3d63c8"),
      hydronicStep("chw-pump", "冷冻水泵", "输送", "#6d8de4"),
      hydronicStep("evaporator", "蒸发器", "吸热降温", "#29c6ff"),
      hydronicStep("chws", "CHWS", "7°C 供水", "#27b7ff"),
      hydronicStep("mau-coil", "MAU 盘管", "空气侧吸热", "#18c8ff"),
    ]),
  }),
  Object.freeze({
    id: "cooling",
    code: "CW",
    title: "冷却水闭环",
    detail: "冷却塔供水吸收冷凝热，再回塔向室外散热",
    steps: Object.freeze([
      hydronicStep("cws", "CWS", "27°C 供水", "#1fc7a5"),
      hydronicStep("cw-pump", "冷却水泵", "输送", "#45d7b8"),
      hydronicStep("condenser", "冷凝器", "吸收冷凝热", "#f2ad42"),
      hydronicStep("cwr", "CWR", "32°C 回水", "#ff8b3d"),
      hydronicStep("cooling-tower", "冷却塔", "蒸发散热", "#55f1df"),
    ]),
  }),
]);

export const REFRIGERATION_CYCLE = Object.freeze([
  Object.freeze({ id: "compression", index: 1, name: "压缩", component: "compressor", color: "#ff6b45", description: "低温低压制冷剂蒸气被压缩为高温高压气体" }),
  Object.freeze({ id: "condensation", index: 2, name: "冷凝", component: "condenser", color: "#ffb23f", description: "制冷剂向冷却水放热并凝结为高压液体" }),
  Object.freeze({ id: "expansion", index: 3, name: "节流", component: "expansion-valve", color: "#a98bff", description: "电子膨胀阀降低制冷剂压力和温度" }),
  Object.freeze({ id: "evaporation", index: 4, name: "蒸发", component: "evaporator", color: "#29c6ff", description: "低压制冷剂吸收冷冻水热量并蒸发" }),
]);

export function getEquipmentById(id) {
  return EQUIPMENT.find((equipment) => equipment.id === id) ?? null;
}
