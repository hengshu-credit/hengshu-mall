const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const {
  root,
  modules,
  transform,
  compiler,
} = require("./theme_component_harness.cjs");
const cleanup = require(path.join(modules, "jsdom-global"))();
after(cleanup);
const Vue = require(path.join(modules, "vue/dist/vue.common.js"));
Vue.config.productionTip = false;
Vue.config.devtools = false;
const api = {},
  links = [];
global.uni = { navigateTo: ({ url }) => links.push(url) };
function load(file) {
  file = path.resolve(root, file);
  if (!path.extname(file))
    file += fs.existsSync(file + ".vue") ? ".vue" : ".js";
  const text = fs.readFileSync(file, "utf8"),
    sfc = file.endsWith(".vue") ? compiler.parseComponent(text) : null,
    m = { exports: {} };
  new Function(
    "module",
    "exports",
    "require",
    transform(sfc ? sfc.script.content : text)
  )(m, m.exports, (name) => {
    if (name === "@/api/ranking") return api;
    if (name === "./commonWrapper.vue")
      return { template: "<div><slot /></div>" };
    if (name.startsWith("."))
      return load(path.resolve(path.dirname(file), name));
    if (name === "@/config/app")
      return { HTTP_REQUEST_URL: "http://localhost:8011" };
    return {};
  });
  if (sfc) {
    const compiled = compiler.compile(sfc.template.content);
    assert.deepEqual(compiled.errors, [], file);
    Object.assign(
      m.exports.default,
      compiler.compileToFunctions(sfc.template.content)
    );
  }
  return m.exports;
}
const tick = async () => {
  await new Promise(setImmediate);
  await Vue.nextTick();
};
const rows = [
  { id: 10, name: "店铺榜", entity_type: "shop", rank: 1 },
  { id: 20, name: "热销榜", entity_type: "product", rank: 5 },
  { id: 30, name: "口碑榜", entity_type: "product", rank: 2 },
  {
    id: 40,
    name: "精选榜",
    entity_type: "product",
    rank: 1,
    page_url: "/pages/annex/special/index?theme_id=40",
  },
];
test("details choose the best product placement and clamp legacy multi-row settings", () => {
  const best = load(
    "template/shared/productRankingInfo.js"
  ).highestProductRanking;
  assert.equal(best(rows).id, 40);
  assert.equal(best([rows[0]]), null);
  assert.equal(best([]), null);
  const config = load("template/shared/rankingComponent.js").rankingComponent;
  assert.equal(config("productRank", { limit: 5 }).limit, 1);
  assert.equal(config("marketingRankInfo", { limit: 5 }).limit, 1);
  assert.equal(config("marketingRanking", { limit: 12 }).limit, 12);
});
test("admin and H5 render one compact line using the real ranking name", () => {
  const config = load("template/shared/rankingComponent.js").rankingComponent(
    "productRank",
    { title: "旧自定义标题", limit: 5 }
  );
  for (const file of [
    "template/admin/src/components/themeActions/RankingDetailDisplay.vue",
    "template/uni-app/subpackage/diyComponents/rankingDetailDisplay.vue",
  ]) {
    const vm = new Vue({
      ...load(file).default,
      propsData: { config, rows },
    }).$mount();
    assert.equal(vm.$el.querySelectorAll(".rank-info").length, 1);
    assert.match(vm.$el.textContent, /TOP 榜单\s*精选榜·第1名/);
    assert.ok(!vm.$el.textContent.includes("旧自定义标题"));
    assert.ok(!vm.$el.textContent.includes("店铺榜"));
    vm.$destroy();
  }
});
test("detail badge ignores stale product responses and opens only its selected ranking", async () => {
  const pending = [];
  api.getProductRankings = (id, limit) =>
    new Promise((resolve) => pending.push({ id, limit, resolve }));
  const component = load(
    "template/uni-app/subpackage/diyComponents/marketingRankInfo.vue"
  ).default;
  const vm = new Vue({
    ...component,
    propsData: { productId: 1, dataConfig: { name: "productRank", limit: 5 } },
  }).$mount();
  assert.equal(pending[0].limit, 1);
  vm.productId = 2;
  await tick();
  pending[1].resolve({ data: { list: rows } });
  await tick();
  pending[0].resolve({
    data: {
      list: [{ id: 99, name: "旧商品榜", rank: 1, entity_type: "product" }],
    },
  });
  await tick();
  assert.equal(vm.list.length, 1);
  assert.equal(vm.list[0].id, 40);
  vm.open(vm.list[0]);
  assert.equal(links.pop(), rows[3].page_url);
  vm.productId = 3;
  await tick();
  pending[2].resolve({ data: { list: [] } });
  await tick();
  assert.equal(vm.list.length, 0);
  assert.equal(vm.$el.nodeType, 8);
  vm.$destroy();
});
