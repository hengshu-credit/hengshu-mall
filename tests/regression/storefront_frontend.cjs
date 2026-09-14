const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../.."),
  deps = path.join(root, "template/admin/node_modules");
const cleanup = require(path.join(deps, "jsdom-global"))();
after(cleanup);
const Vue = require(path.join(deps, "vue/dist/vue.common.js"));
Vue.config.productionTip = false;
Vue.config.devtools = false;
const { transform, compiler } = require("./theme_component_harness.cjs");
const storage = {},
  navigations = [];
global.uni = {
  getStorageSync: (k) => storage[k],
  setStorageSync: (k, v) => {
    storage[k] = v;
  },
  $on() {},
  $off() {},
  $emit() {},
  navigateTo: ({ url }) => navigations.push(url),
  redirectTo: ({ url }) => navigations.push(url),
  setNavigationBarTitle() {},
  getWindowInfo: () => ({ windowWidth: 375, statusBarHeight: 0 }),
};
const api = {};
function load(relative) {
  let file = path.resolve(root, relative);
  if (!path.extname(file))
    file += fs.existsSync(file + ".vue") ? ".vue" : ".js";
  const source = fs.readFileSync(file, "utf8");
  const sfc = file.endsWith(".vue") ? compiler.parseComponent(source) : null;
  const m = { exports: {} };
  new Function(
    "module",
    "exports",
    "require",
    transform(sfc ? sfc.script.content : source)
  )(m, m.exports, (name) => {
    if (name.includes("shared/"))
      return load(path.resolve(path.dirname(file), name));
    if (!sfc && name.startsWith("."))
      return load(path.resolve(path.dirname(file), name));
    if (name.startsWith("@/api/")) return api;
    if (name === '@/mixins/merchantPreview') return load('template/admin/src/mixins/merchantPreview.js');
    if (name === '@/mixins/merchantDecoration') return load('template/uni-app/mixins/merchantDecoration.js');
    if (name === "@/utils/merchantTheme")
      return load("template/uni-app/utils/merchantTheme.js");
    if (name === "@/libs/login")
      return { toLogin: () => navigations.push("login") };
    if (name === "@/utils/theme")
      return { applyTheme: () => Promise.resolve() };
    if (name === "@/config/app")
      return { HTTP_REQUEST_URL: "http://localhost:8011" };
    if (name === "@/mixins/color")
      return { computed: { colorStyle: () => "" } };
    if (/\.(png|jpg)$/.test(name)) return "/placeholder.png";
    return {};
  });
  if (sfc) {
    const out = compiler.compile(sfc.template.content);
    assert.deepEqual(out.errors, [], relative + " template compiles");
    m.exports.default.__template = sfc.template.content;
  }
  return m.exports;
}
const tick = async () => {
  await new Promise(setImmediate);
  await Vue.nextTick();
};
function vmFor(options, props) {
  return new Vue({
    ...options,
    propsData: props,
    render: undefined,
    template: undefined,
  });
}

test("shop defaults are independent and preserve common component styling", () => {
  const config = load("template/shared/merchantDecoration.js");
  const a = config.defaultShopPage(),
    b = config.defaultShopPage();
  assert.equal(a.shop_category_style, 1);
  assert.equal(a.type, "shop");
  assert.deepEqual(
    Object.values(a.value).map((c) => c.name),
    ["shopHeader", "recommendGroup", "shopProducts"]
  );
  Object.values(a.value).find(item=>item.name==='shopHeader').showLogo = false;
  assert.equal(Object.values(b.value).find(item=>item.name==='shopHeader').showLogo, true);
  assert.equal(a.page_title_mode, 'component');
  for (const name of config.merchantModuleNames) {
    const module = config.merchantComponent(name);
    assert.ok(
      module.fillet &&
        module.marginConfig &&
        module.borderConfig &&
        module.shadowConfig
    );
  }
});
test("all six editor previews compile and render configured content", () => {
  const config = load("template/shared/merchantDecoration.js");
  const preview = load(
    "template/admin/src/components/merchantDecoration/Preview.vue"
  ).default;
  for (const name of config.merchantModuleNames) {
    const item = config.merchantComponent(name, { title: "自定义标题" });
    const component = {
      ...preview,
      ...compiler.compileToFunctions(preview.__template),
    };
    const vm = new Vue({
      ...component,
      propsData: { config: item, colorStyle: { theme: "#345678" } },
    }).$mount();
    assert.ok(vm.$el.textContent.trim(), name + " renders");
    vm.$destroy();
  }
});
test("storefront modules preserve shop scope and ignore stale async responses", async () => {
  const pending = [];
  api.getShopProducts = (data) =>
    new Promise((resolve) => pending.push({ data, resolve }));
  const options = load(
    "template/uni-app/subpackage/diyComponents/merchantModules.vue"
  ).default;
  const vm = vmFor(options, {
    dataConfig: { name: "shopProducts", limit: 2 },
    shopId: 7,
  });
  await tick();
  assert.equal(pending[0].data.shop_id, 7);
  vm.shopId = 8;
  await tick();
  assert.equal(pending[1].data.shop_id, 8);
  pending[1].resolve({ data: { list: [{ id: 801 }], count: 3 } });
  await tick();
  pending[0].resolve({ data: { list: [{ id: 701 }], count: 1 } });
  await tick();
  assert.deepEqual(
    vm.products.map((p) => p.id),
    [801]
  );
  const next = vm.loadMore();
  assert.equal(pending[2].data.page, 2);
  assert.equal(pending[2].data.shop_id, 8);
  pending[2].resolve({ data: { list: [{ id: 802 }], count: 2 } });
  await next;
  assert.deepEqual(
    vm.products.map((p) => p.id),
    [801, 802]
  );
  vm.keyword = "灯";
  vm.reload();
  assert.equal(pending[3].data.page, 1);
  assert.equal(pending[3].data.keyword, "灯");
  pending[3].resolve({ data: { list: [], count: 0 } });
  await tick();
  assert.deepEqual(vm.products, []);
  vm.$destroy();
});
test("all three shop category layouts use the complete merchant theme configuration", async () => {
  const normalize = load(
    "template/shared/categoryPageConfig.js"
  ).normalizeCategoryPage;
  const original = normalize({
    status: 2,
    page_title: "主题分类",
    columns: 4,
    image_radius: 18,
    product_layout: "large",
    show_search: 0,
  });
  api.getThemeInfo = async () => ({ data: original });
  const options = load("template/uni-app/pages/merchant/category.vue").default;
  for (const layout of [1, 2, 3]) {
    api.getMerchantTheme = async () => ({
      data: { page: { ...original, status: layout }, palette: {} },
    });
    api.getShop = async () => ({
      data: {
        id: 9,
        name: "商户",
        shop_page: { config: { shop_category_style: layout } },
      },
    });
    const vm = vmFor(options);
    vm.id = 9;
    await vm.load();
    assert.deepEqual(JSON.parse(JSON.stringify(vm.decoration)), {
      ...original,
      status: layout,
    });
    vm.$destroy();
  }
});
test("merchant label follows theme or component switch and opens the current merchant", () => {
  storage.showMerchantName = true;
  storage.previewThemeId = 6;
  const options = load(
    "template/uni-app/components/merchantName/index.vue"
  ).default;
  const vm = vmFor(options, {
    product: { id: 3, seller_shop_id: 11, merchant_name: "测试商户" },
  });
  assert.equal(vm.visible, true);
  vm.openShop();
  assert.equal(navigations.pop(), "/pages/merchant/shop?id=11&theme_id=6");
  vm.show = false;
  assert.equal(vm.visible, false);
  vm.$destroy();
});
test("storefront pages and component entry templates compile", () => {
  for (const file of ["shop", "street", "products", "ranking", "category"])
    load("template/uni-app/pages/merchant/" + file + ".vue");
  for (const file of [
    "shop_street",
    "shop_info",
    "shop_products",
    "recommend_group",
    "product_rank",
    "product_ranking",
  ])
    load("template/admin/src/components/mobilePage/" + file + ".vue");
});

test("merchant editor exposes exactly four configurable pages", () => {
  const sidebar = load(
    "template/admin/src/pages/setting/theme/editTheme/components/Sidebar.vue"
  ).default;
  assert.deepEqual(
    sidebar.computed.visibleMenus
      .call({ merchant: true })
      .map((item) => item.name),
    ["商户首页", "商户分类", "商户详情", "商户风格"]
  );
  load("template/admin/src/pages/setting/theme/merchantTheme/index.vue");
  load("template/uni-app/pages/merchant/followed.vue");
});
test("merchant palette is scoped CSS and does not write global theme storage", () => {
  const before = JSON.stringify(storage);
  const style = load(
    "template/uni-app/utils/merchantTheme.js"
  ).merchantPaletteStyle({
    theme_color: "#AA1122",
    gradient_color: "#BB2233",
    sub_color: "#CC3344",
  });
  assert.ok(style.includes("--view-theme:#AA1122"));
  assert.equal(JSON.stringify(storage), before);
});
test("common search and category links stay inside the current store", () => {
  const { merchantLink } = load("template/shared/merchantLinks.js");
  assert.equal(
    merchantLink("/pages/goods_cate/goods_cate", 7),
    "/pages/merchant/category?id=7"
  );
  assert.equal(
    merchantLink("/pages/goods/goods_list/index?sid=9&keyword=%E7%81%AF", 7),
    "/pages/merchant/products?shop_id=7&category_id=9&keyword=%E7%81%AF"
  );
  assert.equal(
    merchantLink("/pages/goods/goods_search/index", 7),
    "/pages/merchant/products?shop_id=7&category_id=0&keyword="
  );
  assert.equal(
    merchantLink("/pages/goods/goods_search/index", 0),
    "/pages/goods/goods_search/index"
  );
});
test("follow button requires login, guards duplicate taps and updates after server confirmation", async () => {
  const options = load(
    "template/uni-app/components/merchantDecoration/FollowButton.vue"
  ).default;
  const account = Vue.observable({
    getters: { isLogin: false },
    state: { app: { uid: 0 } },
  });
  let mutations = 0;
  let finish;
  api.getShopFollow = async () => ({
    data: { followed: false, follower_count: 4 },
  });
  api.setShopFollow = (id, follow) => {
    mutations++;
    assert.equal(id, 7);
    assert.equal(follow, true);
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const vm = new Vue({
    ...options,
    propsData: { shopId: 7 },
    beforeCreate() {
      this.$store = account;
    },
  });
  await tick();
  await vm.toggle();
  assert.equal(navigations.pop(), "login");
  assert.equal(mutations, 0);
  account.getters.isLogin = true;
  account.state.app.uid = 91;
  await tick();
  const pending = vm.toggle();
  await vm.toggle();
  assert.equal(mutations, 1);
  assert.equal(vm.followed, false);
  finish({ data: { followed: true, follower_count: 5 } });
  await pending;
  assert.equal(vm.followed, true);
  assert.equal(vm.count, 5);
  assert.equal(vm.busy, false);
  vm.$destroy();
});

test("recommendation links use smart page navigation and the existing web view", () => {
  const options=load("template/uni-app/subpackage/diyComponents/merchantModules.vue").default;
  const pages=[];const context={effectiveShopId:7,themeId:()=>9,$util:{JumpPath:url=>pages.push(url)}};
  const open=group=>options.methods.openGroup.call(context,group);
  open({title:'推荐',type:'hot',categoryId:3,link:''});assert.match(pages.pop(),/^\/pages\/merchant\/products\?shop_id=7&recommend=hot&category_id=3/);
  open({linkType:'page',link:'/pages/index/index'});assert.equal(pages.pop(),'/pages/index/index');
  open({linkType:'url',link:'https://example.com/offers?a=1&b=2#top'});assert.equal(navigations.pop(),'/pages/annex/web_view/index?url='+encodeURIComponent('https://example.com/offers?a=1&b=2#top'));
  const before=navigations.length;open({linkType:'url',link:'javascript:alert(1)'});assert.equal(navigations.length,before);
});
