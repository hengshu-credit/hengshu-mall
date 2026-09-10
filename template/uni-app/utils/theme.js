import { getThemeInfo } from "@/api/api.js";
import { paletteVariables } from "../../shared/themePalette";
import { createPaletteRefresher } from "../../shared/paletteRefresh";

/**
 * 处理颜色
 */
export function hexToRgba(hex, alpha) {
  let sColor = hex.toLowerCase();
  const reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
  if (sColor && reg.test(sColor)) {
    if (sColor.length === 4) {
      let sColorNew = "#";
      for (let i = 1; i < 4; i += 1) {
        sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
      }
      sColor = sColorNew;
    }
    //处理六位的颜色值
    let sColorChange = [];
    for (let i = 1; i < 7; i += 2) {
      sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
    }
    return "rgba(" + sColorChange.join(",") + "," + alpha + ")";
  }
  return sColor;
}

/**
 * 设置主题颜色
 * @param {Object} data 主题数据
 */
export function setThemeColor(data) {
  if (data && data.theme_color) {
    const variables = paletteVariables(data);
    const selectedTheme = Object.keys(variables)
      .map((key) => key + ": " + variables[key] + ";")
      .join("\n");
    // #ifdef H5
    Object.keys(variables).forEach((key) =>
      document.documentElement.style.setProperty(key, variables[key])
    );
    // #endif
    if (uni.getStorageSync("viewColor") === selectedTheme) return;
    uni.setStorageSync("viewColor", selectedTheme);
    uni.$emit("ok", selectedTheme);
  }
}

/**
 * 获取并应用主题
 * @param {Number|String} themeId 主题ID
 */
const refreshPalette = createPaletteRefresher(
  (themeId) =>
    getThemeInfo("theme", themeId ? { theme_id: themeId } : {}).then(
      (res) => res.data
    ),
  (data) => {
    if (uni.getStorageSync("is_diy") !== 1) {
      uni.setStorageSync("is_diy", 1);
      uni.$emit("is_diy", 1);
    }
    setThemeColor(data);
  }
);
export function applyTheme(themeId) {
  return refreshPalette(themeId, true).catch(() => null);
}
export function refreshCurrentTheme() {
  return refreshPalette(uni.getStorageSync("previewThemeId") || 0).catch(
    () => null
  );
}
let refreshTimer;
export function startThemeRefresh() {
  stopThemeRefresh();
  refreshCurrentTheme();
  refreshTimer = setInterval(refreshCurrentTheme, 30000);
}
export function stopThemeRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}
