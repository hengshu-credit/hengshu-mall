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

test('all new pages compile with actual component imports', () => {
  for (const file of ['pages/merchant/index.vue', 'pages/merchant/applications.vue', 'pages/merchant/dictionary.vue']) assert.ok(load(file).render);
  const source = fs.readFileSync(path.join(root, 'template/uni-app/pages/merchant/application.vue'), 'utf8');
  const parsed = compiler.parseComponent(source);
  assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
});
