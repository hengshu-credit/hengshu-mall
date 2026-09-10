const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const admin = path.join(root, 'template/admin');
const deps = path.join(admin, 'node_modules');
const babel = require(path.join(deps, '@babel/core'));
const compiler = require(path.join(deps, 'vue-template-compiler'));
const cleanup = require(path.join(deps, 'jsdom-global'))();
const Vue = require(path.join(deps, 'vue/dist/vue.common.js'));
Vue.config.productionTip = false;
Vue.config.devtools = false;
Vue.use(require(path.join(deps, 'element-ui')));
Vue.directive('auth', {});
Vue.directive('db-click', {});
Vue.directive('viewer', {});
Vue.directive('lazy', { bind(el, binding) { el.src = binding.value; } });
after(cleanup);

const flush = async () => { await new Promise(setImmediate); await Vue.nextTick(); };
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
function load(relative, request, overrides = {}) {
  const file = path.join(admin, 'src', relative);
  assert.ok(fs.existsSync(file), `Missing product brand feature: ${relative}`);
  const source = fs.readFileSync(file, 'utf8');
  const parsed = file.endsWith('.vue') ? compiler.parseComponent(source) : null;
  const code = babel.transformSync(parsed ? parsed.script.content : source, {
    babelrc: false, configFile: false,
    plugins: [require(path.join(deps, '@babel/plugin-transform-modules-commonjs'))],
  }).code;
  const mod = { exports: {} };
  const importer = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === '@/libs/request') return request;
    if (name === '@/api/productBrand') return load('api/productBrand.js', request, overrides);
    if (name === './defaultData.js') return load('pages/product/productAdd/defaultData.js', request, overrides);
    if (name === 'vuex') return { mapState: () => ({}) };
    if (name === '@/setting') return { apiBaseURL: '', routePre: '/admin' };
    return {};
  };
  new Function('module', 'exports', 'require', code)(mod, mod.exports, importer);
  if (parsed) return { ...mod.exports.default, ...compiler.compileToFunctions(parsed.template.content) };
  return mod.exports;
}
function pendingApi() {
  const calls = [];
  const request = config => new Promise((resolve, reject) => calls.push({ config, resolve, reject }));
  return { calls, request };
}
function mountSelect(api, props = {}) {
  const component = load('components/productBrandSelect/index.vue', api.request);
  const app = new Vue({
    data: () => ({ ids: [], categories: [], brands: [], ...props }),
    render(h) { return h(component, {
      ref: 'select', props: { value: this.ids, cateIds: this.categories, selectedBrands: this.brands },
      on: { input: value => { this.ids = value; } },
    }); },
  }).$mount();
  document.body.appendChild(app.$el);
  return { app, select: app.$refs.select, destroy() { app.$destroy(); app.$el.remove(); } };
}

test('refreshing cached navigation adds the brand entry to the rendered product sidebar and updates permissions', async () => {
  Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: () => null } });
  const api = pendingApi();
  const Vuex = require(path.join(deps, 'vuex'));
  Vue.use(Vuex);
  const overrides = {
    '@/api/account': load('api/account.js', api.request),
    '@/libs/system': load('libs/system/index.js', api.request, { lodash: require(path.join(deps, 'lodash')) }),
  };
  const store = new Vuex.Store({ modules: {
    menus: load('store/module/menus.js', api.request, overrides).default,
    routesList: load('store/module/routesList.js', api.request).default,
    userInfo: load('store/module/userInfo.js', api.request).default,
    menu: { namespaced: true, state: { activePath: '' } },
    themeConfig: { namespaced: true, state: { themeConfig: { layout: 'defaults', isCollapse: false } } },
  } });
  const cached = [{ path: '/admin/product', title: '商品', is_show: 1, children: [
    { path: '/admin/product/product_list', title: '商品管理', is_show: 1 },
  ] }];
  store.commit('menus/getmenusNav', cached);
  store.commit('routesList/getRoutesList', cached);
  store.commit('userInfo/uniqueAuth', ['old-permission']);
  const fresh = plain(cached);
  fresh[0].children.push({ path: '/admin/product/brand/list', title: '商品品牌', is_show: 1 });
  const refresh = store.dispatch('menus/getMenusNavList');
  assert.equal(api.calls[0].config.url, '/menus');
  api.calls[0].resolve({ data: { menus: fresh, unique: ['admin-product-brand-list'] } });
  await refresh;
  assert.deepEqual(plain(store.state.routesList.routesList), fresh, 'Sidebar must receive fresh backend menus');
  assert.deepEqual(plain(store.state.userInfo.uniqueAuth), ['admin-product-brand-list']);
  assert.deepEqual(plain(store.state.userInfo.access), ['admin-product-brand-list']);
  assert.ok(store.state.menus.oneLvRoutes.some(item => item.path === '/admin/product/brand/list'));
  const vertical = load('layout/navMenu/vertical.vue', api.request, {
    '@/layout/navMenu/subItem.vue': load('layout/navMenu/subItem.vue', api.request),
    vuex: Vuex,
  });
  const router = { currentRoute: { path: '/admin/product/product_list' } };
  const view = new Vue({ store, render(h) { return h(vertical, { props: { menuList: store.state.routesList.routesList } }); } });
  Vue.prototype.$t = value => value;
  Vue.prototype.$route = router.currentRoute;
  Vue.prototype.$router = router;
  view.$mount();
  try {
    await flush();
    const brandEntry = [...view.$el.querySelectorAll('.el-menu-item')].find(item => item.textContent.includes('商品品牌'));
    assert.ok(brandEntry, 'Brand is rendered as a navigable product child');
    assert.ok(view.$children[0].$children[0].items['/admin/product/brand/list']);
  } finally { view.$destroy(); }
  const beforeFailure = plain(store.state);
  const failure = store.dispatch('menus/getMenusNavList');
  api.calls[1].reject({ msg: 'offline' });
  await assert.rejects(failure);
  assert.deepEqual(plain(store.state), beforeFailure, 'Transient errors preserve usable navigation');
  const revoked = store.dispatch('menus/getMenusNavList');
  api.calls[2].resolve({ data: { menus: [], unique: [] } });
  await revoked;
  assert.deepEqual(plain(store.state.menus.oneLvRoutes), [], 'No permissions leaves an empty route array');
  assert.deepEqual(plain(store.state.routesList.routesList), []);
  assert.deepEqual(plain(store.state.userInfo.uniqueAuth), []);
});

test('admin layout refreshes navigation after mounting and then notifies every sidebar layout', async () => {
  const layout = load('layout/index.vue', () => {}, { vuex: { mapMutations: () => ({}) } });
  assert.equal(typeof layout.mounted, 'function', 'Reloading an authenticated layout must refresh persisted menus');
  const events = [];
  const context = {
    $store: { dispatch: async action => { events.push(action); } },
    $nextTick: async () => {},
    bus: { $emit: event => events.push(event) },
  };
  await layout.mounted.call(context);
  assert.deepEqual(events, ['menus/getMenusNavList', 'routesListChange']);
  context.$store.dispatch = async () => { throw new Error('offline'); };
  events.length = 0;
  await layout.mounted.call(context);
  assert.deepEqual(events, [], 'Failed menu refresh does not emit an incomplete sidebar update');
});

test('category changes keep unavailable selected brands removable and use latest response', async () => {
  const api = pendingApi();
  const view = mountSelect(api, { ids: [7], categories: [11], brands: [{ id: 7, name: '原品牌', logo: '' }] });
  try {
    assert.deepEqual(plain(api.calls[0].config), {
      url: 'product/brand/options', method: 'get', params: { cate_ids: [11], selected_ids: [7] },
    });
    assert.match(view.app.$el.textContent, /原品牌/, 'Existing selected brand has a name before the request completes');
    view.app.categories = [22];
    await flush();
    api.calls.at(-1).resolve({ data: [{ id: 7, name: '原品牌', logo: '', available: false }, { id: 8, name: '新品牌', logo: '', available: true }] });
    await flush();
    api.calls[0].resolve({ data: [{ id: 7, name: '原品牌', logo: '', available: true }, { id: 9, name: '过期候选', logo: '', available: true }] });
    await flush();
    assert.deepEqual(plain(view.app.ids), [7], 'Changing categories never silently clears a selection');
    assert.match(view.app.$el.textContent, /原品牌.*不可用/s);
    assert.ok(view.select.$children[0].options.some(option => option.value === 8), 'Latest candidates remain');
    assert.ok(!view.select.$children[0].options.some(option => option.value === 9), 'Late response cannot reintroduce stale candidates');
    const tagClose = view.app.$el.querySelector('.el-tag__close');
    assert.ok(tagClose, 'Unavailable selected brands expose a remove action');
    tagClose.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();
    assert.deepEqual(plain(view.app.ids), []);
  } finally { view.destroy(); }
});

test('option request failures preserve selected names and offer a working retry', async () => {
  const api = pendingApi();
  const view = mountSelect(api, { ids: [3], categories: [4], brands: [{ id: 3, name: '保留品牌' }] });
  try {
    api.calls[0].reject({ msg: '网络异常' });
    await flush();
    assert.deepEqual(plain(view.app.ids), [3]);
    assert.match(view.app.$el.textContent, /保留品牌/);
    assert.match(view.app.$el.textContent, /网络异常/);
    const retry = [...view.app.$el.querySelectorAll('button')].find(button => button.textContent.includes('重试'));
    assert.ok(retry, 'Failure has a visible retry action');
    retry.click();
    await flush();
    assert.equal(api.calls.length, 2);
    api.calls[1].resolve({ data: [{ id: 3, name: '保留品牌', logo: '', available: true }] });
    await flush();
    assert.doesNotMatch(view.app.$el.textContent, /网络异常/);
    assert.deepEqual(plain(view.app.ids), [3]);
  } finally { view.destroy(); }
});

test('brand search permits multiple available brands and never admits unavailable candidates', async () => {
  const api = pendingApi();
  const view = mountSelect(api);
  try {
    api.calls[0].resolve({ data: [{ id: 1, name: '通用品牌', logo: '', available: true }, { id: 2, name: '分类品牌', logo: '', available: true }, { id: 3, name: '停用品牌', logo: '', available: false }] });
    await flush();
    const select = view.select.$children[0];
    assert.equal(select.multiple, true);
    assert.equal(select.filterable, true);
    const disabled = select.options.find(option => option.value === 3);
    assert.equal(disabled.disabled, true);
    select.options.find(option => option.value === 1).$el.click();
    await flush();
    select.options.find(option => option.value === 2).$el.click();
    await flush();
    assert.deepEqual(plain(view.app.ids).sort(), [1, 2]);
    disabled.$el.click();
    await flush();
    assert.deepEqual(plain(view.app.ids).sort(), [1, 2]);
  } finally { view.destroy(); }
});

test('a selected deleted brand stays visible as unavailable even when omitted by the API', async () => {
  const api = pendingApi();
  const view = mountSelect(api, { ids: [91], brands: [{ id: 91, name: '旧品牌' }] });
  try {
    api.calls[0].resolve({ data: [] });
    await flush();
    assert.match(view.app.$el.textContent, /旧品牌.*不可用/s);
    assert.deepEqual(plain(view.app.ids), [91]);
  } finally { view.destroy(); }
});

function productPage(productCache = () => Promise.resolve({ data: { info: [] } })) {
  const options = load('pages/product/productAdd/index.vue', () => {}, {
    '@/api/product': { productCache },
  });
  const page = { $route: { params: {} }, $message: { error(message) { throw new Error(message); } } };
  Object.assign(page, options.data.call(page), options.methods);
  ['virtualbtn', 'getproductLabelUseListApi', 'watchActivity', 'checkAllGroup', 'generateHeader'].forEach(name => { page[name] = () => {}; });
  return page;
}

test('new products, edit/copy/collection payloads normalize optional brand IDs', () => {
  const page = productPage();
  assert.deepEqual(plain(page.formValidate.brand_ids), [], 'New products always initialize the optional array');
  for (const copy of [false, true]) {
    page.infoData({ brand_ids: ['7', 8], brand_list: [{ id: 7, name: '回显品牌' }], spec_type: 0 }, copy);
    assert.deepEqual(plain(page.formValidate.brand_ids), [7, 8]);
    assert.equal(page.formValidate.brand_list[0].name, '回显品牌');
    page.infoData({ spec_type: 0 }, copy);
    assert.deepEqual(plain(page.formValidate.brand_ids), [], 'Old product/collection payloads cannot inherit another product brands');
    assert.deepEqual(plain(page.formValidate.brand_list), []);
  }
});

test('old drafts without brands and new drafts with brands restore an array', async () => {
  for (const brands of [undefined, ['7', 8]]) {
    const info = { cate_id: [1], label_id: [], attrs: [], items: [], spec_type: 0, brand_ids: brands };
    const page = productPage(() => Promise.resolve({ data: { info } }));
    page.getProductCache();
    await flush();
    assert.deepEqual(plain(page.formValidate.brand_ids), brands ? [7, 8] : []);
    assert.deepEqual(plain(page.formValidate.brand_list), []);
  }
});

test('brand editor validates specified categories, saves independent levels and clears scope for global brands', async () => {
  const api = pendingApi();
  const component = load('pages/product/brandList/index.vue', api.request, {
    '@/api/product': { cascaderListApi: () => Promise.resolve({ data: [] }) },
  });
  const page = new Vue({ ...component, mounted: undefined, created: undefined });
  const messages = [];
  page.$message = { success() {}, error: value => messages.push(value) };
  page.$refs.form = { validate: callback => callback(true), clearValidate() {} };
  page.getList = () => {};
  page.openCreate();
  page.form.name = '测试品牌';
  page.form.is_global = 0;
  page.save();
  assert.equal(api.calls.length, 0, 'A scoped brand requires at least one selected category');
  assert.ok(messages.length);
  page.form.cate_ids = [1, 12, 123];
  page.save();
  assert.deepEqual(plain(api.calls[0].config.data.cate_ids), [1, 12, 123]);
  assert.equal(api.calls[0].config.url, 'product/brand/save/0');
  api.calls[0].resolve({ msg: '保存成功' });
  await flush();
  page.openCreate();
  page.form.name = '通用品牌';
  page.form.cate_ids = [1, 12];
  page.save();
  assert.deepEqual(plain(api.calls[1].config.data.cate_ids), [], 'Global brands do not retain hidden category scope');
  api.calls[1].resolve({ msg: '保存成功' });
  await flush();
  page.$destroy();
});

test('failed status changes preserve the server-confirmed status', async () => {
  const api = pendingApi();
  const component = load('pages/product/brandList/index.vue', api.request);
  const page = { $message: { error() {}, success() {} }, $set(o, key, value) { o[key] = value; }, $delete(o, key) { delete o[key]; } };
  Object.assign(page, component.data.call(page), component.methods);
  const row = { id: 5, status: 1 };
  page.changeStatus(row, 0);
  assert.equal(api.calls[0].config.url, 'product/brand/status/5/0');
  api.calls[0].reject({ msg: '修改失败' });
  await flush();
  assert.equal(row.status, 1);
});

test('late product details with new selected IDs trigger their names and availability lookup', async () => {
  const api = pendingApi();
  const view = mountSelect(api, { categories: [4] });
  try {
    api.calls[0].resolve({ data: [{ id: 1, name: '当前候选', available: true }] });
    await flush();
    view.app.ids = [66];
    view.app.brands = [{ id: 66, name: '详情品牌' }];
    await flush();
    assert.deepEqual(plain(api.calls[1].config.params), { cate_ids: [4], selected_ids: [66] });
    api.calls[1].resolve({ data: [{ id: 66, name: '详情品牌', available: false }] });
    await flush();
    assert.match(view.app.$el.textContent, /详情品牌.*不可用/s);
    assert.deepEqual(plain(view.app.ids), [66]);
  } finally { view.destroy(); }
});

test('brand list preserves zero-valued filters, resets pagination and ignores stale list responses', async () => {
  const api = pendingApi();
  const component = load('pages/product/brandList/index.vue', api.request);
  const page = {};
  Object.assign(page, component.data.call(page), component.methods);
  page.getList();
  page.filters = { page: 3, limit: 15, name: '品牌', status: 0, is_global: 0, cate_id: 12 };
  page.search();
  assert.deepEqual(plain(api.calls[1].config.params), { page: 1, limit: 15, name: '品牌', status: 0, is_global: 0, cate_id: 12 });
  api.calls[1].resolve({ data: { list: [{ id: 2, name: '查询结果' }], count: 1 } });
  await flush();
  api.calls[0].resolve({ data: { list: [{ id: 1, name: '过期结果' }], count: 20 } });
  await flush();
  assert.deepEqual(plain(page.list), [{ id: 2, name: '查询结果' }]);
  assert.equal(page.total, 1);
  page.sizeChange(30);
  assert.equal(api.calls[2].config.params.limit, 30);
  assert.equal(api.calls[2].config.params.page, 1);
  api.calls[2].reject({ msg: '列表失败' });
  await flush();
  assert.equal(page.listError, '列表失败');
  assert.equal(page.loading, false);
  assert.equal(page.list[0].id, 2);
});

test('brand editor renders independent multilevel category selection and preserves the form after save failure', async () => {
  const api = pendingApi();
  const component = load('pages/product/brandList/index.vue', api.request);
  const page = new Vue({ ...component, mounted: undefined }).$mount();
  document.body.appendChild(page.$el);
  const messages = [];
  page.$message = { error: message => messages.push(message), success() {} };
  page.$imgModal = callback => callback({ att_dir: 'https://example.test/new-logo.png' });
  try {
    page.treeSelect = [{ value: 1, label: '一级', children: [{ value: 12, label: '二级', children: [{ value: 123, label: '三级' }] }] }];
    page.openEdit({ id: 5 });
    api.calls[0].resolve({ data: { id: 5, name: '编辑品牌', logo: 'https://example.test/brand.png', description: '描述', sort: '3', status: '0', is_global: '0', cate_ids: ['1', '123'], cate_names: ['一级', '三级'] } });
    await flush();
    assert.deepEqual(plain(page.form.cate_ids), [1, 123]);
    assert.equal(page.form.status, 0);
    const descendants = component => component.$children.flatMap(child => [child, ...descendants(child)]);
    const picker = descendants(page).filter(child => child.$options.name === 'ElCascader').find(child => child.config.multiple);
    assert.ok(picker, 'Scoped edit form exposes a category multi-select');
    assert.equal(picker.config.checkStrictly, true, 'Parents and descendants can be checked independently');
    assert.equal(picker.config.emitPath, false, 'Category IDs are a flat array for the API');
    const nodes = picker.panel.getCheckedNodes();
    assert.deepEqual(nodes.map(node => node.value).sort((a, b) => a - b), [1, 123]);
    assert.ok(!nodes.some(node => node.value === 12), 'Selecting a parent does not silently check its other descendants');
    page.selectLogo();
    assert.equal(page.form.logo, 'https://example.test/new-logo.png');
    page.save();
    await flush();
    assert.equal(api.calls[1].config.url, 'product/brand/save/5');
    api.calls[1].reject({ msg: '品牌名称已存在' });
    await flush();
    assert.equal(page.dialogVisible, true);
    assert.equal(page.saving, false);
    assert.deepEqual(plain(page.form.cate_ids), [1, 123]);
    assert.ok(messages.includes('品牌名称已存在'));
  } finally {
    page.$destroy(); page.$el.remove();
  }
});

test('referenced brands cannot be deleted and deleting a last page item returns to the previous page', async () => {
  const api = pendingApi();
  const component = load('pages/product/brandList/index.vue', api.request);
  const page = {
    $message: { error() {}, success() {} },
    $set(o, key, value) { o[key] = value; }, $delete(o, key) { delete o[key]; },
    $confirm: () => Promise.resolve(),
  };
  Object.assign(page, component.data.call(page), component.methods);
  await page.remove({ id: 2, name: '关联品牌', product_count: 1 });
  assert.equal(api.calls.length, 0);
  page.filters.page = 3;
  page.list = [{ id: 5, name: '待删除品牌', product_count: 0 }];
  const deleting = page.remove(page.list[0]);
  await flush();
  assert.deepEqual(plain(api.calls[0].config), { url: 'product/brand/del/5', method: 'delete' });
  api.calls[0].resolve({ msg: '删除成功' });
  await deleting;
  assert.equal(api.calls[1].config.params.page, 2);
  api.calls[1].resolve({ data: { list: [], count: 0 } });
  await flush();
});
