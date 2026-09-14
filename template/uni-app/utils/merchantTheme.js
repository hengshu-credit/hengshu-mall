import { paletteVariables } from "../../shared/themePalette";
export function merchantPaletteStyle(palette) {
  if (!palette || !palette.theme_color) return "";
  return Object.entries(paletteVariables(palette))
    .map(([key, value]) => key + ":" + value)
    .join(";");
}
