const colors = [
  ["classic-red", "经典红", "#E93323", "#FF7931", "#FAAD14"],
  ["sky-blue", "清新蓝", "#3388FF", "#67B4FF", "#DCEBFF"],
  ["coral", "珊瑚橙", "#FF553C", "#FF8745", "#FFBC69"],
  ["orange", "活力橙", "#FF6A00", "#FF9900", "#FFD6A0"],
  ["rose", "柔和粉", "#FF4D7D", "#FF84A3", "#FFE4ED"],
  ["red-black", "红与黑", "#FF4141", "#FF6666", "#333333"],
  ["gold-black", "金与黑", "#D99A00", "#FFC400", "#202832"],
  ["mint", "薄荷绿", "#24A58A", "#61CDB5", "#D2F5EC"],
  ["green", "自然绿", "#21A342", "#58C76A", "#DDF3DD"],
  ["champagne", "香槟金", "#B08B45", "#CEAE6B", "#F3EBDD"],
  ["graphite", "石墨黑", "#292933", "#51515F", "#E9E9F0"],
  ["violet", "优雅紫", "#804DFF", "#AD85FF", "#EEE5FF"],
];
export const themePresets = colors.map(
  ([palette_id, label, theme_color, gradient_color, sub_color]) => ({
    palette_id,
    label,
    palette_mode: "preset",
    theme_color,
    gradient_color,
    sub_color,
  })
);
export const validHex = (color) =>
  typeof color === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color);
export const validPalette = (value) =>
  !!value &&
  ["theme_color", "gradient_color", "sub_color"].every((key) =>
    validHex(value[key])
  );
function hex(color, fallback) {
  if (!validHex(color)) color = fallback;
  return (
    color.length === 4
      ? "#" +
        color
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      : color
  ).toUpperCase();
}
export function paletteAlpha(color, alpha) {
  const c = hex(color, "#E93323").slice(1);
  return `rgba(${parseInt(c.slice(0, 2), 16)}, ${parseInt(
    c.slice(2, 4),
    16
  )}, ${parseInt(c.slice(4, 6), 16)}, ${alpha})`;
}
export function normalizePalette(value = {}) {
  value = value || {};
  const result = {};
  ["theme_color", "gradient_color", "sub_color"].forEach((key) => {
    result[key] = hex(value[key], themePresets[0][key]);
  });
  const preset = themePresets.find((p) =>
    ["theme_color", "gradient_color", "sub_color"].every(
      (key) => p[key] === result[key]
    )
  );
  result.light_color = paletteAlpha(result.theme_color, 0.1);
  result.palette_mode =
    value.palette_mode === "custom" || !preset ? "custom" : "preset";
  result.palette_id = result.palette_mode === "preset" ? preset.palette_id : "";
  return result;
}
export function editorPalette(value) {
  const p = normalizePalette(value);
  return {
    theme: p.theme_color,
    gradient: p.gradient_color,
    priceColor: p.theme_color,
    bntColor: p.sub_color,
    minorColor: p.sub_color,
    minorColorT: p.light_color,
  };
}
export function paletteVariables(value) {
  const p = normalizePalette(value),
    primary = p.theme_color;
  return {
    "--view-theme": primary,
    "--view-theme-16": primary,
    "--view-priceColor": primary,
    "--view-minorColor": p.sub_color,
    "--view-minorColorT": p.light_color,
    "--view-bntColor": p.sub_color,
    "--view-gradient": p.gradient_color,
    "--view-main-start": p.gradient_color,
    "--view-main-over": primary,
    "--view-op-ten": p.light_color,
    "--view-op-point-four": paletteAlpha(primary, 0.04),
    "--view-op-point-eight": paletteAlpha(primary, 0.8),
    "--view-linear": `linear-gradient(180deg, ${paletteAlpha(
      primary,
      0.2
    )} 0%, rgba(255,255,255,0) 100%)`,
  };
}
