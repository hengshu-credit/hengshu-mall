const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const admin = path.join(root, 'template/admin');
const deps = path.join(admin, 'node_modules');
const cleanup = require(path.join(deps, 'jsdom-global'))();
const babel = require(path.join(deps, '@babel/core'));
const compiler = require(path.join(deps, 'vue-template-compiler'));
const Vue = require(path.join(deps, 'vue'));
Vue.config.productionTip = false;
Vue.config.devtools = false;
Vue.use(require(path.join(deps, 'element-ui')));
Vue.directive('auth', {});
after(cleanup);
const flush = async () => {
  for (let i = 0; i < 5; i++) { await new Promise(setImmediate); await Vue.nextTick(); }
  // Element UI tables debounce slot/column layout when a form first becomes visible.
  await new Promise((resolve) => setTimeout(resolve, 60));
  await Vue.nextTick();
};
const plain = (value) => JSON.parse(JSON.stringify(value));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function load(relative, api, cache = {}) {
  let file = path.join(admin, 'src', relative);
  if (!path.extname(file)) file += '.js';
  if (cache[file]) return cache[file];
  const source = fs.readFileSync(file, 'utf8');
  const parsed = file.endsWith('.vue') ? compiler.parseComponent(source) : null;
  const code = babel.transformSync(parsed ? parsed.script.content : source, { babelrc: false, configFile: false, plugins: [require(path.join(deps, '@babel/plugin-transform-modules-commonjs'))] }).code;
  const mod = { exports: {} };
  const importer = (name) => {
    if (name === '@/api/fullReduction') return api;
    if (name === '@/libs/request') return api.request;
    if (name.startsWith('.')) return load(path.relative(path.join(admin, 'src'), path.resolve(path.dirname(file), name)), api, cache);
    return require(path.join(deps, name));
  };
  new Function('module', 'exports', 'require', code)(mod, mod.exports, importer);
  if (parsed) {
    const compiled = compiler.compile(parsed.template.content);
    assert.deepEqual(compiled.errors, [], `${relative}: template compile errors`);
    mod.exports.default = { ...mod.exports.default, ...compiler.compileToFunctions(parsed.template.content) };
  }
  cache[file] = mod.exports;
  return mod.exports;
}
function mount(relative, api, propsData = {}) {
  const Component = Vue.extend(load(`pages/marketing/fullReduction/${relative}`, api).default);
  const vm = new Component({ propsData });
  vm.messages = [];
  vm.$message = { error: (message) => vm.messages.push(message), success: (message) => vm.messages.push(message) };
  vm.$confirm = async () => true;
  vm.$mount();
  document.body.appendChild(vm.$el);
  return vm;
}
function destroy(vm) { vm.$destroy(); if (vm.$el.parentNode) vm.$el.parentNode.removeChild(vm.$el); }
const formModule = load('pages/marketing/fullReduction/form.js', {});
function validForm() { const form = formModule.emptyForm(); form.name = '周末活动'; form.rules = [{ threshold: 100, discount: 10 }]; return form; }
const row = (id = 1) => ({
  id, name: '周末活动', unit: 1, rules_type: 1, discount_type: 1, rules: [{ threshold: '100.00', discount: '10.00' }],
  start_time: 1800000000, end_time: 1800086400, start_time_text: '2027-01-15 08:00:00', end_time_text: '2027-01-16 08:00:00',
  type_name: '满额减价', state: 'pending', state_name: '未开始', status: 1, sort: 50, range_type: 3,
  product_ids: [1], products: [{ id: 1, name: '测试商品' }], level_ids: [2], levels: [{ id: 2, name: '黄金会员' }],
  member_type: 'tag', member_ids: [3], members: [{ id: 3, name: '老客户' }], tag_match: 'all',
});

test('rules validate amount/quantity, cycles, discounts, ordered tiers and audience intersection', () => {
  const valid = validForm();
  assert.equal(formModule.formError(valid), '');
  for (const change of [
    { name: ' ' }, { time_range: [] }, { time_range: ['2027-01-01 00:00:00', '2026-01-01 00:00:00'] },
    { rules: [] }, { rules_type: 0, discount_type: 2 }, { unit: 2, rules: [{ threshold: 1.5, discount: 1 }] },
    { rules: [{ threshold: 100, discount: 100 }] }, { rules: [{ threshold: 100, discount: 10 }, { threshold: 100, discount: 20 }] },
    { discount_type: 2, rules: [{ threshold: 100, discount: 10 }] }, { range_type: 3, product_ids: [] },
    { member_type: 'tag', member_ids: [] }, { member_type: 'level', member_ids: [2], level_ids: [1] }, { sort: undefined },
  ]) assert.notEqual(formModule.formError({ ...valid, ...change }), '', JSON.stringify(change));
  assert.equal(formModule.formError({ ...valid, unit: 2, rules_type: 0, rules: [{ threshold: 3, discount: 10 }] }), '');
  const result = formModule.payload({ ...valid, product_ids: [99], member_ids: [88] });
  assert.deepEqual(result.product_ids, []);
  assert.deepEqual(result.member_ids, []);
  assert.equal(result.rules[0].threshold, '100');
  assert.ok(!('time_range' in result));
});

test('API wiring preserves verbs, IDs and mutation payloads', async () => {
  const calls = [];
  const api = load('api/fullReduction.js', { request: async (config) => calls.push(config) });
  await api.fullReductionStatusApi(7, 0);
  await api.fullReductionSortApi(7, 12);
  await api.fullReductionBatchDeleteApi([7, 8]);
  assert.deepEqual(calls.map((entry) => [entry.url, entry.method, entry.data]), [
    ['marketing/full_reduction/status/7', 'put', { status: 0 }],
    ['marketing/full_reduction/sort/7', 'put', { sort: 12 }],
    ['marketing/full_reduction/batch_delete', 'post', { ids: [7, 8] }],
  ]);
});

test('picker keeps cross-page selections and removes only the current page selection', async () => {
  const vm = mount('OptionPicker.vue', { fullReductionOptionsApi: async ({ page }) => ({ data: { count: 40, list: page === 1 ? [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] : [{ id: 3, name: 'C' }, { id: 4, name: 'D' }] } }) }, { initial: [{ id: 1, name: 'A' }] });
  try {
    await flush();
    vm.$refs.table.toggleRowSelection(vm.list[1], true);
    await flush();
    assert.deepEqual(plain(vm.selected.map((item) => item.id)), [1, 2]);
    vm.pageChange(2); await flush();
    vm.$refs.table.toggleRowSelection(vm.list[0], true); await flush();
    assert.deepEqual(plain(vm.selected.map((item) => item.id)), [1, 2, 3]);
    vm.pageChange(1); await flush();
    vm.$refs.table.toggleRowSelection(vm.list[1], false); await flush();
    assert.deepEqual(plain(vm.selected.map((item) => item.id)).sort(), [1, 3]);
    vm.clear(); await flush();
    assert.equal(vm.selected.length, 0);
    assert.equal(vm.$refs.table.selection.length, 0);
  } finally { destroy(vm); }
});

test('picker ignores stale option responses and retains selected IDs on load failure', async () => {
  const requests = [];
  const vm = mount('OptionPicker.vue', { fullReductionOptionsApi: () => { const item = deferred(); requests.push(item); return item.promise; } }, { initial: [{ id: 9, name: '先前选择' }] });
  try {
    vm.search();
    requests[1].resolve({ data: { list: [{ id: 2, name: '新结果' }], count: 1 } }); await flush();
    requests[0].resolve({ data: { list: [{ id: 1, name: '旧结果' }], count: 1 } }); await flush();
    assert.equal(vm.list[0].id, 2);
    vm.search(); requests[2].reject({ msg: '选择项网络错误' }); await flush();
    assert.equal(vm.error, '选择项网络错误');
    assert.equal(vm.selected[0].id, 9);
  } finally { destroy(vm); }
});

test('edit form restores all settings and keeps input after a failed save', async () => {
  const calls = [];
  let rejectSave = true;
  const vm = mount('ActivityForm.vue', {
    fullReductionInfoApi: async () => ({ data: row(7) }),
    fullReductionSaveApi: async (id, data) => { calls.push({ id, data }); if (rejectSave) throw { msg: '活动范围冲突' }; return { data: { id } }; },
  }, { id: 7 });
  try {
    await flush();
    assert.equal(vm.form.rules[0].threshold, 100);
    assert.equal(vm.products[0].name, '测试商品');
    assert.equal(vm.form.tag_match, 'all');
    assert.ok(vm.$el.classList.contains('full-reduction-drawer-host'));
    const thresholdInput = vm.$el.querySelector('.rules-editor .el-input-number input');
    assert.equal(thresholdInput.disabled, false, 'rule inputs become editable after loading');
    assert.notEqual(thresholdInput.getAttribute('aria-disabled'), 'true', 'numeric controls are accessible after detail loading');
    assert.match(vm.$el.textContent, /参与客户限制/);
    vm.form.name = '修改后的活动';
    await vm.save();
    assert.equal(vm.saveError, '活动范围冲突');
    assert.equal(vm.form.name, '修改后的活动');
    assert.equal(vm.saving, false);
    assert.equal(calls[0].id, 7);
    assert.deepEqual(plain(calls[0].data.member_ids), [3]);
    assert.ok(!('products' in calls[0].data));
    let saved = false; vm.$on('saved', () => { saved = true; });
    rejectSave = false; await vm.save();
    assert.ok(saved);
  } finally { destroy(vm); }
});

test('failed detail load cannot overwrite a record with defaults; new forms reset incompatible rules and audiences', async () => {
  let saved = 0;
  const vm = mount('ActivityForm.vue', { fullReductionInfoApi: async () => { throw { msg: '详情失败' }; }, fullReductionSaveApi: async () => { saved++; } }, { id: 8 });
  try { await flush(); await vm.save(); assert.equal(saved, 0); assert.equal(vm.loadError, '详情失败'); }
  finally { destroy(vm); }
  const fresh = mount('ActivityForm.vue', {});
  try {
    fresh.form = validForm();
    for (let i = 0; i < 8; i++) fresh.addRule();
    assert.equal(fresh.form.rules.length, 5);
    fresh.form.discount_type = 2; fresh.form.rules_type = 0; fresh.changeRulesType();
    assert.equal(fresh.form.rules.length, 1); assert.equal(fresh.form.discount_type, 1);
    assert.equal(fresh.form.rules[0].discount, undefined);
    fresh.members = [{ id: 5, name: '会员' }]; fresh.form.member_ids = [5]; fresh.changeMemberRange(0);
    assert.equal(fresh.form.member_type, 'all'); assert.deepEqual(plain(fresh.form.member_ids), []);
    fresh.form.unit = 2; fresh.changeUnit(); assert.equal(fresh.form.rules[0].threshold, undefined);
  } finally { destroy(fresh); }
});

test('double save sends one request and an unavailable selection blocks saving', async () => {
  let calls = 0;
  const pending = deferred();
  const vm = mount('ActivityForm.vue', { fullReductionSaveApi: () => { calls++; return pending.promise; } });
  try {
    vm.form = validForm(); vm.products = [{ id: 1, unavailable: true }];
    await vm.save(); assert.equal(calls, 0);
    vm.products = []; const first = vm.save(); const second = vm.save();
    assert.equal(calls, 1); assert.equal(vm.saving, true);
    pending.resolve({ data: { id: 1 } }); await Promise.all([first, second]);
  } finally { destroy(vm); }
});

test('clicking partial members works through the real radio-group input event', async () => {
  const vm = mount('ActivityForm.vue', {});
  try {
    await flush();
    const label = [...vm.$el.querySelectorAll('.el-radio')].find(el => el.textContent.includes('部分会员'));
    label.querySelector('input').click();
    await flush();
    assert.equal(vm.form.member_type, 'user');
    assert.match(vm.$el.textContent, /选择会员/);
    vm.openPicker('members');
    vm.confirmSelection([{ id: 7, name: '会员7' }]);
    assert.deepEqual(plain(vm.form.member_ids), [7]);
    const all = [...vm.$el.querySelectorAll('.el-radio')].find(el => el.textContent.trim() === '全部会员');
    all.querySelector('input').click(); await flush();
    assert.equal(vm.form.member_type, 'all');
    assert.deepEqual(plain(vm.form.member_ids), []);
  } finally { destroy(vm); }
});

test('product tab filters categories/brands/tags and can exclude or restore one product', async () => {
  const requests = [];
  const product = { id: 1, name: '商品A', price: '100.00' };
  const vm = mount('ProductScope.vue', { fullReductionOptionsApi: async params => {
    requests.push(params);
    return { data: params.type === 'product_filters' ? { categories: [], brands: [], labels: [] } : { list: [product], count: 1 } };
  } });
  const changes = [];
  vm.$on('change', change => { changes.push(plain(change)); vm.rangeType = change.rangeType; vm.selected = change.selected; });
  try {
    await flush();
    vm.filters = { keyword: '商品', category_id: 2, brand_id: 3, label_id: 4 }; vm.search(); await flush();
    assert.deepEqual(plain(requests.at(-1)), { type: 'product', keyword: '商品', category_id: 2, brand_id: 3, label_id: 4, page: 1, limit: 20 });
    vm.toggle(product); await flush();
    assert.equal(vm.rangeType, 4); assert.equal(vm.participates(product), false);
    assert.deepEqual(changes.at(-1).selected.map(item => item.id), [1]);
    vm.toggle(product); await flush(); assert.equal(vm.rangeType, 0); assert.equal(vm.participates(product), true);
    vm.changeRange(3); await flush(); vm.add([product]); await flush(); assert.equal(vm.participates(product), true);
    vm.remove(product); await flush(); assert.equal(vm.rangeType, 3); assert.equal(vm.selected.length, 0);
  } finally { destroy(vm); }
});

test('list handles stale responses, search reset, failed status change and confirmed batch deletion', async () => {
  const requests = [], deletes = [];
  let immediate = false;
  const vm = mount('index.vue', {
    fullReductionListApi: () => { if (immediate) return Promise.resolve({ data: { list: [], count: 0 } }); const item = deferred(); requests.push(item); return item.promise; },
    fullReductionStatusApi: async () => { throw { msg: '启用冲突' }; },
    fullReductionBatchDeleteApi: async (ids) => deletes.push(ids),
  });
  try {
    vm.filters.page = 3; vm.filters.name = '新查询'; vm.search();
    assert.equal(vm.filters.page, 1);
    requests.at(-1).resolve({ data: { list: [row(2)], count: 1 } }); await flush();
    for (const request of requests.slice(0, -1)) request.resolve({ data: { list: [row(1)], count: 1 } });
    await flush(); assert.equal(vm.list[0].id, 2);
    await vm.changeStatus(vm.list[0], 0);
    assert.equal(vm.list[0].status, 1); assert.ok(vm.messages.includes('启用冲突'));
    immediate = true; vm.selection = [2, 3]; await vm.removeSelected();
    assert.deepEqual(plain(deletes), [[2, 3]]);
    assert.equal(vm.selection.length, 0);
    vm.filters.name = '搜索'; vm.filters.state = 'pending'; vm.reset(); await flush();
    assert.equal(vm.filters.name, ''); assert.equal(vm.filters.state, '');
  } finally { destroy(vm); }
});
