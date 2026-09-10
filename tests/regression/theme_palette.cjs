const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { root, transform } = require("./theme_component_harness.cjs");
const m = { exports: {} };
new Function(
  "module",
  "exports",
  transform(
    fs.readFileSync(path.join(root, "template/shared/themePalette.js"), "utf8")
  )
)(m, m.exports);
const {
  themePresets,
  normalizePalette,
  editorPalette,
  paletteVariables,
  validPalette,
} = m.exports;
assert(themePresets.length >= 10);
for (const p of themePresets) {
  assert(validPalette(p));
  const n = normalizePalette(p);
  assert.equal(n.palette_mode, "preset");
  assert.equal(editorPalette(n).theme, n.theme_color);
  assert.equal(editorPalette(n).bntColor, n.sub_color);
  assert.equal(paletteVariables(n)["--view-priceColor"], n.theme_color);
}
assert.equal(normalizePalette({ theme_color: "#abc" }).theme_color, "#AABBCC");
assert.equal(
  normalizePalette({
    theme_color: "#123456",
    gradient_color: "#654321",
    sub_color: "#abcdef",
  }).palette_mode,
  "custom"
);
assert.equal(
  normalizePalette({ theme_color: "#123456" }).light_color,
  "rgba(18, 52, 86, 0.1)"
);
assert(
  !validPalette({
    theme_color: "url(x)",
    gradient_color: "#fff",
    sub_color: "#fff",
  })
);
assert(
  !validPalette({
    theme_color: null,
    gradient_color: "#fff",
    sub_color: "#fff",
  })
);
assert.notEqual(normalizePalette({}).theme_color, undefined);
console.log(
  "PASS palette presets, legacy normalization, validation and editor/client color parity"
);

const { compiler } = require("./theme_component_harness.cjs");
const goodModule = { exports: {} };
new Function(
  "module",
  "exports",
  "require",
  transform(
    compiler.parseComponent(
      fs.readFileSync(
        path.join(
          root,
          "template/uni-app/subpackage/diyComponents/goodList.vue"
        ),
        "utf8"
      )
    ).script.content
  )
)(goodModule, goodModule.exports, (id) =>
  id === "vuex" ? { mapGetters: () => ({}), mapState: () => ({}) } : {}
);
const price = goodModule.exports.default.computed.priceColor;
assert.equal(
  price.call({
    dataConfig: {
      toneConfig: { tabVal: 0 },
      toneCartConfig: { tabVal: 1 },
      goodsPriceColor: { color: [{ item: "#123456" }] },
    },
  }),
  "var(--view-theme)",
  "custom cart does not detach theme-bound price"
);
assert.equal(
  price.call({
    dataConfig: {
      toneConfig: { tabVal: 1 },
      toneCartConfig: { tabVal: 0 },
      goodsPriceColor: { color: [{ item: "#123456" }] },
    },
  }),
  "#123456",
  "custom price is independent from cart tone"
);
console.log("PASS product price and cart color bindings are independent");
