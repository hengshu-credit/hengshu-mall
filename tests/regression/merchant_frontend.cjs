const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const admin = path.join(root, 'template/admin');
const deps = path.join(admin, 'node_modules');
const cleanup = require(path.join(deps, 'jsdom-global'))();
const Vue = require(path.join(deps, 'vue/dist/vue.common.js'));
require.cache[require.resolve(path.join(deps, 'vue'))] = { exports: Vue };
const babel = require(path.join(deps, '@babel/core'));
const compiler = require(path.join(deps, 'vue-template-compiler'));
Vue.config.productionTip = false; Vue.config.devtools = false;
Vue.use(require(path.join(deps, 'element-ui')));
Vue.prototype.$route = { name: 'merchantShopList', query: {} };
Vue.prototype.$router = { push: () => {} };
after(cleanup);
const flush = async () => { await new Promise(setImmediate); await Vue.nextTick(); };
function load(relative, api = {}) {
  let file = path.resolve(admin, 'src', relative);
  if (!path.extname(file)) file += fs.existsSync(file + '.vue') ? '.vue' : '.js';
  const source = fs.readFileSync(file, 'utf8');
  const parsed = file.endsWith('.vue') ? compiler.parseComponent(source) : null;
  const code = babel.transformSync(parsed ? parsed.script.content : source, { filename: file, babelrc: false, configFile: false, plugins: [require(path.join(deps, '@babel/plugin-transform-modules-commonjs'))] }).code;
  const mod = { exports: {} };
  const importer = name => {
    if (name === '@/api/merchant') return { operationKey: () => 'test_operation_key_123', ...api };
    if (name.startsWith('.')) return load(path.relative(path.join(admin, 'src'), path.resolve(path.dirname(file), name)), api);
    throw new Error('Unexpected import: ' + name);
  };
  new Function('module', 'exports', 'require', code)(mod, mod.exports, importer);
  if (!parsed) return mod.exports;
  const compiled = compiler.compile(parsed.template.content);
  assert.deepEqual(compiled.errors, [], relative + ' compiles');
  return { ...mod.exports.default, ...compiler.compileToFunctions(parsed.template.content) };
}
function mount(component, props) {
  const vm = new Vue({ data: () => ({ props }), render(h) { return h(component, { ref: 'subject', props: this.props, on: { input: value => { this.props.value = value; } } }); } }).$mount();
  document.body.appendChild(vm.$el);
  return { vm, child: vm.$refs.subject, destroy() { vm.$destroy(); vm.$el.remove(); } };
}
const profile = () => ({ name: '测试商户', type_id: 2, tag_ids: [], subject_kind: 'company', subject_name: '测试公司', identity_number: '91****7890', bank_account: '62****5555', document_ids: [] });

test('merchant form stays neutral, preserves basic contact fields and protects sensitive inputs', async () => {
  const component = load('pages/merchant/components/MerchantForm.vue');
  const app = mount(component, { value: profile(), types: [{ id: 2, name: '供应商', status: 1 }], tags: [], documents: [], readonly: false, sensitive: false, canFiles: false });
  await flush();
  const text = app.vm.$el.textContent;
  assert.ok(text.includes('联系地址') && text.includes('电子合同与资质'));
  assert.ok(!text.includes('经营方式') && !text.includes('上下游') && !text.includes('地址确认书') && !text.includes('收件人'));
  const bank = [...app.vm.$el.querySelectorAll('input')].find(input => input.value === '62****5555');
  assert.ok(bank && bank.disabled, 'basic editor cannot edit bank fields');
  app.child.set('contact_address', '新联系地址'); await flush();
  assert.equal(app.vm.props.value.contact_address, '新联系地址');
  app.destroy();
});

test('merchant details display label-value content and only the selected attachments without form controls', async () => {
  const component = load('pages/merchant/components/MerchantDetail.vue');
  const value = { ...profile(), tag_ids: [5], contact_address: '上海市测试路 1 号', document_ids: [12] };
  const app = mount(component, { value, meta: { code: 'PLATFORM', state: 'open', audit_status: 'approved' }, types: [{ id: 2, name: '合作商户' }], tags: [{ id: 5, name: '优选' }], documents: [{ id: 11, kind: 'contract', name: '旧合同.pdf' }, { id: 12, kind: 'contract', name: '当前合同.pdf' }], canFiles: false });
  await flush();
  const root = app.vm.$el;
  assert.equal(root.querySelectorAll('input, textarea, select, .el-form').length, 0);
  const entries = [...root.querySelectorAll('.detail-row')];
  const findValue = label => entries.find(row => row.querySelector('dt').textContent === label).querySelector('dd').textContent;
  assert.equal(findValue('商户名称'), '测试商户');
  assert.equal(findValue('商户类型'), '合作商户');
  assert.equal(findValue('联系地址'), '上海市测试路 1 号');
  assert.equal(findValue('银行账号'), '62****5555', 'server masking is preserved');
  assert.equal(findValue('邮箱'), '—', 'missing data has a plain placeholder');
  assert.ok(root.textContent.includes('优选') && root.textContent.includes('PLATFORM'));
  assert.ok(root.textContent.includes('当前合同.pdf') && !root.textContent.includes('旧合同.pdf'));
  assert.equal(root.querySelectorAll('.detail-file-actions button').length, 0, 'file actions require permission');
  app.vm.props.canFiles = true; await flush();
  assert.equal(root.querySelectorAll('.detail-file-actions button').length, 2);
  app.destroy();
});

test('merchant names and business IDs have independent columns and viewing switches to a form only when editing', async () => {
  const p = profile();
  const record = { id: 3, code: 'M000003', version: 1, audit_status: 'approved', state: 'open', profile: p, documents: [], pending: null };
  const component = load('pages/merchant/index.vue', { merchantGet: async route => ({ data: route === 'config' ? { permissions: { save: true }, types: [{ id: 2, name: '合作商户' }], tags: [] } : route === 'shop/list' ? { count: 1, list: [{ ...p, ...record, type_name: '合作商户', tags: [] }] } : record }) });
  const app = mount(component, {}); await flush(); await flush();
  const table = app.child.$children.flatMap(child => child.$children).find(child => child.$options.name === 'ElTable');
  const columns = table.store.states.columns;
  assert.ok(columns.some(column => column.label === '商户名称'));
  assert.ok(columns.some(column => column.label === '商户ID' && column.property === 'code'));
  assert.equal(app.vm.$el.querySelector('.merchant-name').textContent.trim(), '测试商户');
  await app.child.open({ id: 3 }, false); await flush();
  assert.ok(app.vm.$el.querySelector('.merchant-detail'));
  assert.equal(app.vm.$el.querySelectorAll('.drawer-body input, .drawer-body textarea, .drawer-body select').length, 0);
  app.child.editing = true; await flush();
  assert.ok(app.vm.$el.querySelector('.drawer-body .el-form'));
  assert.equal(app.vm.$el.querySelectorAll('.merchant-detail').length, 0);
  app.destroy();
});

test('uploaded contracts become draft attachments without losing previous references', async () => {
  const component = load('pages/merchant/components/MerchantForm.vue', { uploadMerchantDocument: async () => ({ data: { id: 12, kind: 'contract', name: '新合同.pdf', created_at: 1 } }) });
  const app = mount(component, { value: { ...profile(), document_ids: [11] }, types: [], tags: [], documents: [{ id: 11, kind: 'contract', name: '旧合同.pdf', created_at: 1 }], shopId: 3, sensitive: true, canFiles: true });
  let success = false;
  await app.child.upload({ file: { size: 12 }, onSuccess() { success = true; }, onError(error) { throw error; } }); await flush();
  assert.ok(success); assert.deepEqual([...app.vm.props.value.document_ids], [11, 12]);
  app.child.remove({ id: 11 }); await flush();
  assert.deepEqual([...app.vm.props.value.document_ids], [12]);
  assert.equal(app.vm.props.documents[0].name, '旧合同.pdf', 'parent historical metadata is not mutated');
  app.destroy();
});

test('merchant selector rejects stale search responses and defaults only when requested', async () => {
  const calls = [];
  const component = load('components/merchantSelect/index.vue', { merchantOptions: params => new Promise(resolve => calls.push({ params, resolve })) });
  const app = mount(component, { value: null, autoDefault: true });
  calls[0].resolve({ data: [{ id: 1, name: '平台商城', is_platform: true, available: true }] }); await flush();
  assert.equal(app.vm.props.value, 1);
  const first = app.child.search('旧'); const second = app.child.search('新');
  calls[2].resolve({ data: [{ id: 3, name: '新搜索', available: true }] }); await second;
  calls[1].resolve({ data: [{ id: 2, name: '旧搜索', available: true }] }); await first; await flush();
  assert.equal(app.child.options[0].name, '新搜索');
  assert.equal(app.vm.props.value, 1, 'remote search does not replace selected merchant');
  app.destroy();
});

test('history displays audits and field differences through one table', async () => {
  const component = load('pages/merchant/components/MerchantHistory.vue', { merchantGet: async () => ({ data: { count: 2, list: [
    { id: 2, event_type: 'change', stage: 'effective', actor_name: '管理员', created_at: 10, summary: '联系地址', changes: [{ label: '联系地址', before: '旧地址', after: '新地址' }], documents: [] },
    { id: 1, event_type: 'audit', stage: 'effective', actor_name: '审核员', created_at: 9, summary: '审核通过', opinion: '资料一致', changes: [], documents: [] },
  ] } }) });
  const app = mount(component, { shopId: 3, canFiles: false }); await flush(); await flush();
  assert.ok(app.vm.$el.textContent.includes('联系地址') && app.vm.$el.textContent.includes('审核通过'), JSON.stringify({ error: app.child.error, rows: app.child.list, text: app.vm.$el.textContent }));
  const table = app.child.$children.find(item => item.$options.name === 'ElTable');
  table.toggleRowExpansion(app.child.list[0], true); await flush();
  assert.ok(app.vm.$el.textContent.includes('旧地址') && app.vm.$el.textContent.includes('新地址'));
  app.destroy();
});

test('optional merchant selection stays empty and can explicitly remove an existing owner', async () => {
  const component = load('components/merchantSelect/index.vue', { merchantOptions: async () => ({ data: [{ id: 1, name: '平台商城', is_platform: true, available: true }] }) });
  const app = mount(component, { value: null, clearable: true, emptyValue: 0 }); await flush();
  assert.equal(app.vm.props.value, null, 'platform merchant is not selected automatically');
  app.child.change(1); await flush(); assert.equal(app.vm.props.value, 1);
  app.child.change(''); await flush(); assert.equal(app.vm.props.value, 0, 'clearing has an explicit unassigned value');
  app.destroy();
});

test('product assignment preserves selection after failure and reuses the request key on retry', async () => {
  const calls = [];
  const component = load('pages/merchant/components/MerchantProductAssignment.vue', { merchantOptions: async () => ({ data: [] }), merchantWrite: async (route, payload) => { calls.push({ route, payload }); if (calls.length === 1) throw new Error('网络暂时不可用'); return { data: { changed: 1 } }; } });
  const app = mount(component, { visible: true, products: [{ id: 8, store_name: '测试商品', seller_shop_id: 2, merchant_name: '原商户', is_show: 1 }] }); await flush();
  app.child.$message = { success() {} };
  app.child.targetId = 3; await app.child.submit(); await flush();
  assert.ok(app.vm.$el.textContent.includes('网络暂时不可用'));
  assert.equal(app.child.chosen[0].id, 8); assert.equal(app.child.targetId, 3);
  await app.child.submit();
  assert.equal(calls[0].route, 'product/assign');
  assert.deepEqual(calls[0].payload.product_ids, [8]);
  assert.equal(calls[0].payload.shop_id, 3); assert.equal(calls[0].payload.entry, 'assign');
  assert.equal(calls[0].payload.request_key, calls[1].payload.request_key);
  app.child.targetId = 0; await app.child.submit();
  assert.equal(calls[2].payload.shop_id, 0, 'clear assignment is sent as zero');
  app.destroy();
});

test('merchant claim keeps selected products across pages and calls the same allocation endpoint', async () => {
  const calls = []; const queries = [];
  const component = load('pages/merchant/components/MerchantProductAssignment.vue', { merchantGet: async (route, query) => { queries.push(query); return { data: { list: [{ id: query.page === 1 ? 31 : 32, store_name: '可认领商品', merchant_name: '其他商户', is_show: 1 }], count: 21 } }; }, merchantWrite: async (route, payload) => { calls.push({ route, payload }); return { data: { changed: 2 } }; } });
  const app = mount(component, { visible: true, mode: 'claim', shop: { id: 9, name: '目标商户' } }); await flush(); await flush();
  app.child.$message = { success() {} };
  const table = app.child.$refs.products;
  table.toggleRowSelection(app.child.rows[0], true); await flush();
  app.child.page = 2; await app.child.load(); await flush();
  table.toggleRowSelection(app.child.rows[0], true); await flush();
  assert.deepEqual(app.child.chosen.map(row => row.id).sort(), [31, 32]);
  await app.child.submit();
  assert.equal(calls[0].route, 'product/assign'); assert.equal(calls[0].payload.entry, 'claim'); assert.equal(calls[0].payload.shop_id, 9);
  assert.deepEqual(calls[0].payload.product_ids, [31, 32]);
  app.child.owner = '0'; app.child.keyword = '31'; await app.child.search(); await flush();
  assert.equal(queries[queries.length - 1].owner, '0');
  assert.equal(queries[queries.length - 1].keyword, '31');
  app.child.clearSelection(); await flush(); assert.equal(app.child.chosen.length, 0);
  app.destroy();
});

test('all new pages compile with actual component imports', () => {
  for (const file of ['pages/merchant/index.vue', 'pages/merchant/applications.vue', 'pages/merchant/dictionary.vue']) assert.ok(load(file).render);
  const source = fs.readFileSync(path.join(root, 'template/uni-app/pages/merchant/application.vue'), 'utf8');
  const parsed = compiler.parseComponent(source);
  assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
});
