const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const Vue = require(path.join(root, 'template/admin/node_modules/vue'));
const Vuex = require(path.join(root, 'template/admin/node_modules/vuex'));
const babel = require(path.join(root, 'template/admin/node_modules/@babel/core'));
const { preprocess } = require(path.join(root, 'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
Vue.use(Vuex);
Vue.config.productionTip = false;
Vue.config.devtools = false;
const flush = async () => { for (let i = 0; i < 8; i++) await Vue.nextTick(); };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const events = new Vue(), storage = new Map(), requests = [];
let categoryGeometryReads = 0;
const uni = {
  $on: events.$on.bind(events), $off: events.$off.bind(events), $emit: events.$emit.bind(events),
  getWindowInfo: () => ({ windowHeight: 800, windowWidth: 390, statusBarHeight: 0 }),
  getSystemInfo: options => { const value = { windowHeight: 800, windowWidth: 390, titleBarHeight: 0 }; options?.success(value); return value; },
  getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value), hideTabBar() {},
  createSelectorQuery() {
    let selector;
    return { in() { return this; }, selectAll(value) { selector = value; return this; }, boundingClientRect() { return this; },
      exec(callback) {
        if (selector === '.listw') { categoryGeometryReads++; callback([[{ top: 50 }, { top: 150 }, { top: 450 }]]); }
        else callback([[{ height: 44 }, { height: 50 }, { height: 56 }]]);
      },
    };
  },
};
const imports = {
  vuex: Vuex,
  '@/api/store.js': { getCategoryList: () => { const task = deferred(); requests.push({ type: 'categories', ...task }); return task.promise; }, getProductslist: params => { const task = deferred(); requests.push({ type: 'products', params, ...task }); return task.promise; } },
  '@/api/api.js': { getThemeInfo: () => { const task = deferred(); requests.push({ type: 'theme', ...task }); return task.promise; } },
  '@/api/public.js': { getCategoryVersion: () => { const task = deferred(); requests.push({ type: 'version', ...task }); return task.promise; } },
};
function load(file, platform = { H5: true }, named = false) {
  if (!path.extname(file)) file += '.js';
  let source = fs.readFileSync(path.join(root, 'template/uni-app', file), 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  source = preprocess(source, platform, { type: 'js' });
  const { code } = babel.transformSync(source, { babelrc: false, configFile: false, plugins: [require(path.join(root, 'template/admin/node_modules/@babel/plugin-transform-modules-commonjs'))] });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, uni,
    getApp: () => ({ globalData: {} }), getCurrentPages: () => [{ route: 'pages/goods_cate/goods_cate' }],
    setTimeout: () => 1, clearTimeout() {},
    require: id => id in imports ? imports[id]
      : id === '@/utils/categoryNavigation.js' ? load(id.slice(2), platform, true)
        : (id.startsWith('@/mixins/') ? load(id.slice(2), platform) : {}),
  });
  return named ? module.exports : module.exports.default;
}
const store = new Vuex.Store({ getters: { isLogin: () => false, uid: () => 1 }, state: { indexData: { cartNum: 0 } } });
function instance(options, overrides = {}) {
  return new Vue({ ...options, store, render: h => h('div'), ...overrides,
    beforeCreate() { this.$t = t => t; this.$util = { SplitArray: (list, previous) => previous.concat(list) }; },
  });
}
(async () => {
  const color = load('mixins/color.js');
  storage.set('viewColor', '--view-theme: #123456;');
  const themed = instance(color);
  assert.equal(themed.colorStyle, '--view-theme: #123456;');
  events.$emit('ok', '--view-theme: #abcdef;');
  assert.equal(themed.colorStyle, '--view-theme: #abcdef;', 'Live theme changes must still reach mounted components');
  themed.$destroy();
  events.$emit('ok', '--view-theme: #ffffff;');
  assert.equal(themed.colorStyle, '--view-theme: #abcdef;');
  for (let i = 0; i < 10; i++) instance(color).$destroy();
  assert.equal(events._events.ok?.length || 0, 0, 'Destroyed components must release theme listeners');
  for (const layout of [1, 2, 3]) {
    const options = load(`pages/goods_cate/goods_cate${layout}.vue`);
    let refreshes = 0;
    const category = instance(options, { methods: { ...options.methods, getAllCategory() { refreshes++; }, getCartNum() {}, getCartList() {} } }).$mount();
    if (layout === 3) {
      await flush();
      assert.equal(category.scrollHeight, 650, 'Layout 3 must size its scroll area after rendering, without a one-second timer');
    }
    const before = refreshes;
    events.$emit('uploadCatData');
    assert.equal(refreshes, before + 1);
    category.$destroy();
    events.$emit('uploadCatData');
    assert.equal(refreshes, before + 1, 'Destroyed category layout must not refresh');
    assert.equal(events._events.uploadCatData?.length || 0, 0);
  }
  const layoutOne = instance(load('pages/goods_cate/goods_cate1.vue'));
  layoutOne.productList = [{ children: [] }, { children: [] }, { children: [] }];
  layoutOne.infoScroll();
  assert.equal(categoryGeometryReads, 1, 'All category positions must be measured together');
  for (const [scrollTop, expected] of [[0, 0], [99, 0], [100, 1], [399, 1], [400, 2], [900, 2]]) {
    layoutOne.lock = false;
    layoutOne.scroll({ detail: { scrollTop } });
    assert.equal(layoutOne.navActive, expected, `Category scroll selection at ${scrollTop}`);
  }
  layoutOne.$destroy();
  requests.length = 0;
  const initialData = { data: [{ id: 1, children: [] }] };
  const shared = instance(load('mixins/categoryData.js'), { propsData: { initialCategoryRequest: Promise.resolve(initialData) } });
  const firstData = await shared.loadCategoryData();
  firstData.data[0].children.push({ id: 2 });
  assert.equal(initialData.data[0].children.length, 0, 'Layout-specific changes must not mutate the shared response');
  assert.equal(requests.length, 0, 'First mount must reuse the pending category read');
  const fresh = shared.loadCategoryData();
  assert.equal(requests.length, 1, 'Subsequent category refreshes must fetch fresh data');
  requests[0].resolve({ data: [{ id: 3 }] });
  assert.equal((await fresh).data[0].id, 3);
  shared.$destroy();
  requests.length = 0;
  const parentOptions = load('pages/goods_cate/goods_cate.vue');
  const parent = instance(parentOptions);
  parentOptions.onShow.call(parent);
  assert.deepEqual(requests.map(r => r.type).sort(), ['categories', 'theme', 'version'], 'Independent bootstrap requests must start together');
  requests.find(r => r.type === 'version').resolve({ data: { version: '1' } });
  requests.find(r => r.type === 'categories').resolve({ data: [{ id: 1, cate_name: 'A', children: [] }] });
  requests.find(r => r.type === 'theme').resolve({ data: { status: 2 } });
  await flush();
  assert.equal(parent.category, 2);
  parent.$destroy();
  for (const platform of [{ MP: true, MP_WEIXIN: true }, { APP_PLUS: true }]) {
    requests.length = 0;
    const nativeOptions = load('pages/goods_cate/goods_cate.vue', platform);
    const nativeParent = instance(nativeOptions);
    nativeOptions.onShow.call(nativeParent);
    assert.equal(nativeParent.initialCategoryRequest, null, 'Non-H5 component props must not receive promises');
    assert.deepEqual(requests.map(r => r.type).sort(), ['theme', 'version']);
    nativeParent.$destroy();
  }
  for (const layout of [2, 3]) {
    requests.length = 0;
    const options = load(`pages/goods_cate/goods_cate${layout}.vue`);
    const category = instance(options, { methods: { ...options.methods, goTop() {} } });
    category.cid = 1; category.limit = 2;
    category.productslist();
    category.cid = 2; category.tempArr = []; category.loadend = false;
    category.productslist();
    assert.equal(requests.length, 2, 'A new category must not be blocked by the previous request');
    requests[1].resolve({ data: [{ id: 2 }, { id: 3 }] });
    await flush();
    requests[0].resolve({ data: [{ id: 1 }] });
    await flush();
    assert.equal(category.tempArr[0].id, 2, 'Late results must not overwrite the selected category');
    assert.equal(category.page, 2);
    category.productslist(); category.productslist();
    assert.equal(requests.length, 3, 'Same-category pagination must still deduplicate pending requests');
    requests[2].resolve({ data: [{ id: 4 }] });
    await flush();
    assert.equal(category.tempArr.length, 3);
    assert.equal(category.loadend, true);
    category.$destroy();
  }
  console.log('PASS: theme/category listener cleanup, parallel bootstrap, latest category wins and pagination');
})().catch(error => { console.error(error); process.exitCode = 1; });
