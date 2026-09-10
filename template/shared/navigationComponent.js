import { commonStyleDefaults } from "./componentStyle";
export function navigationComponent(value = {}, timestamp = Date.now() * 1000) {
  const tab = (tabVal) => ({ tabVal });
  const color = (title, value) => ({
    title,
    default: [{ item: value }],
    color: [{ item: value }],
  });
  const background =
    value.mainNavigation && value.mainNavigation.backgroundMode === "system"
      ? "#FFFFFF"
      : (
          value[
            value.navConfig && value.navConfig.tabVal ? "bgColor2" : "bgColor"
          ] || {}
        ).color?.[0]?.item || "#FFFFFF";
  const result = {
    ...commonStyleDefaults(background),
    cname: "导航栏",
    name: "mainNavigation",
    timestamp,
    id: "id" + timestamp,
    isHide: false,
    setUp: tab(0),
    effectConfig: tab(1),
    scrollMode: 'always',
    navConfig: tab(0),
    navStyleConfig: {
      title: "展示内容",
      tabVal: 0,
      tabList: [{ name: "图标和文字" }, { name: "仅文字" }, { name: "仅图标" }],
    },
    toneConfig: {
      title: "文字色调",
      tabVal: 0,
      tabList: [{ name: "跟随主题风格" }, { name: "自定义" }],
    },
    txtColor: color("未选中文字", "#333333"),
    activeTxtColor: color("选中文字", "#E93323"),
    bgColor: color("背景颜色", background),
    bgColor2: color("背景颜色", background),
    topConfig: { val: 0 },
    bottomConfig: { val: 0 },
    prConfig: { val: 0 },
    mbConfig: { val: 0 },
    menuList: ["首页", "分类", "购物车", "我的"].map((name, i) => ({
      name,
      link: [
        "/pages/index/index",
        "/pages/goods_cate/goods_cate",
        "/pages/order_addcart/order_addcart",
        "/pages/user/index",
      ][i],
      imgList: [
        `/static/images/${i + 1}-002.png`,
        `/static/images/${i + 1}-001.png`,
      ],
    })),
    ...JSON.parse(JSON.stringify(value)),
  };
  if (!value.componentBgConfig) {
    result.fillet = commonStyleDefaults().fillet;
    result.fillet.val = value.mainNavigation?.corner || value.fillet?.val || 0;
    result.paddingConfig.isAll = true;
    result.paddingConfig.valList = [
      value.topConfig?.val || 0,
      0,
      value.bottomConfig?.val || 0,
      0,
    ].map((val) => ({ val }));
    if (value.navConfig?.tabVal) {
      result.marginConfig.isAll = true;
      result.marginConfig.valList = [
        0,
        value.prConfig?.val || 0,
        value.mbConfig?.val || 0,
        value.prConfig?.val || 0,
      ].map((val) => ({ val }));
    }
  }
  delete result.bgColor; // Common-style background controls replace the legacy duplicate field.
  result.effectConfig = { tabVal: 1 };
  result.name = "mainNavigation";
  result.cname = "导航栏";
  result.timestamp = timestamp;
  result.id = "id" + timestamp;
  result.mainNavigation = {
    ...value.mainNavigation,
    pageScoped: true,
    title: value.mainNavigation?.title || "导航栏",
  };
  return result;
}
