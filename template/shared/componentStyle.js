const color = (title, value, double = false) => ({
  title,
  default: [{ item: value }, ...(double ? [{ item: value }] : [])],
  color: [{ item: value }, ...(double ? [{ item: value }] : [])],
});
const radio = (title, names, tabVal = 0) => ({
  title,
  tabVal,
  tabList: names.map((name) => ({ name })),
});
const number = (title, val = 0, max = 100, min = 0) => ({
  title,
  val,
  max,
  min,
});
export function commonStyleDefaults(background = "#FFFFFF") {
  return {
    titleCurrency: "通用样式",
    moduleColor: color("组件背景", background, true),
    bottomBgColor: color("底部背景", "rgba(255,255,255,0)"),
    componentBgConfig: {
      ...radio("背景设置", ["颜色", "图片"]),
      colorConfig: color("背景颜色", background, true),
      colorDirection: radio("渐变方向", ["横向", "纵向", "左斜", "右斜"]),
      imageConfig: {
        header: "背景图片",
        name: "选择素材",
        type: "code",
        url: "",
      },
    },
    fillet: {
      ...number("背景圆角"),
      type: 0,
      list: [
        { val: "全部", icon: "iconcaozuo-zhengti" },
        { val: "单个", icon: "iconcaozuo-bianjiao" },
      ],
      valName: "圆角值",
      valList: [0, 0, 0, 0].map((val) => ({ val })),
    },
    marginConfig: {
      ...number("外边距"),
      isAll: false,
      valList: [0, 0, 0, 0].map((val) => ({ val })),
    },
    paddingConfig: {
      ...number("内边距"),
      isAll: false,
      valList: [0, 0, 0, 0].map((val) => ({ val })),
    },
    borderConfig: {
      ...radio("边框设置", ["隐藏", "显示"]),
      styleConfig: radio("边框样式", ["实线", "虚线", "点线"]),
      widthConfig: number("边框宽度", 1, 10),
      colorConfig: color("边框颜色", "#EEEEEE"),
    },
    shadowConfig: {
      ...radio("阴影设置", ["隐藏", "显示"]),
      colorConfig: color("阴影颜色", "rgba(0,0,0,0.15)"),
      xConfig: number("水平偏移", 0, 50, -50),
      yConfig: number("垂直偏移", 2, 50, -50),
      blurConfig: number("模糊距离", 6, 50),
      spreadConfig: number("扩散距离", 0, 50, -50),
    },
  };
}
export function componentStyle(
  config = {},
  unit = "px",
  imageUrl = (url) => url
) {
  const px = (value) => (Number(value) || 0) * (unit === "rpx" ? 2 : 1) + unit;
  const first = (value, fallback = "") =>
    value && value.color && value.color[0] ? value.color[0].item : fallback;
  const outer = {
    background: first(config.bottomBgColor),
    display: "flow-root",
  };
  const inner = { boxSizing: "border-box" };
  ["margin", "padding"].forEach((name) => {
    const value = config[name + "Config"];
    if (!value) return;
    ["Top", "Right", "Bottom", "Left"].forEach((side, i) => {
      inner[name + side] = px(
        value.isAll
          ? ((value.valList && value.valList[i]) || {}).val
          : value.val
      );
    });
  });
  const gradient = (value, direction) => {
    const colors = ((value && value.color) || []).map((item) => item.item);
    return colors.length > 1
      ? `linear-gradient(${[90, 180, 135, 200][direction] || 90}deg, ${
          colors[0]
        }, ${colors[1]})`
      : colors[0]
      ? `linear-gradient(${colors[0]}, ${colors[0]})`
      : undefined;
  };
  const base = gradient(config.moduleColor, 0);
  inner.background = base;
  const bg = config.componentBgConfig;
  if (bg && Number(bg.tabVal) === 1 && (bg.imageConfig || {}).url) {
    inner.backgroundImage =
      "url(" + JSON.stringify(imageUrl((bg.imageConfig || {}).url)) + ")";
    inner.backgroundSize = "cover";
    inner.backgroundPosition = "center";
    inner.backgroundRepeat = "no-repeat";
  } else if (bg) {
    const surface = gradient(bg.colorConfig, (bg.colorDirection || {}).tabVal);
    inner.background =
      surface && base ? `${surface}, ${base}` : surface || base;
  }
  if (config.fillet)
    inner.borderRadius = Number(config.fillet.type) === 1
      ? [0, 1, 3, 2]
          .map((i) =>
            px(((config.fillet.valList && config.fillet.valList[i]) || {}).val)
          )
          .join(" ")
      : px(config.fillet.val);
  const border = config.borderConfig,
    shadow = config.shadowConfig;
  if (border && Number(border.tabVal))
    inner.border = `${px((border.widthConfig || {}).val)} ${
      ["solid", "dashed", "dotted"][(border.styleConfig || {}).tabVal] ||
      "solid"
    } ${first(border.colorConfig)}`;
  if (shadow && Number(shadow.tabVal))
    inner.boxShadow =
      ["x", "y", "blur", "spread"]
        .map((key) => px((shadow[key + "Config"] || {}).val))
        .join(" ") +
      " " +
      first(shadow.colorConfig);
  return { outer, inner };
}
export function verticalStyleSpace(config = {}) {
  let result = 0;
  ["marginConfig", "paddingConfig"].forEach((key) => {
    const v = config[key];
    if (v)
      result += v.isAll
        ? Number(((v.valList && v.valList[0]) || {}).val || 0) +
          Number(((v.valList && v.valList[2]) || {}).val || 0)
        : 2 * Number(v.val);
  });
  if (config.borderConfig && Number(config.borderConfig.tabVal))
    result += 2 * Number((config.borderConfig.widthConfig || {}).val || 0);
  return result;
}
