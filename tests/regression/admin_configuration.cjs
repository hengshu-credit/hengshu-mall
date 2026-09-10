const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const admin = path.resolve(__dirname, '../../template/admin');
const babel = require(path.join(admin, 'node_modules/@babel/core'));
const Vue = require(path.join(admin, 'node_modules/vue'));
const compiler = require(path.join(admin, 'node_modules/vue-template-compiler'));
function component(file, imports = {}) {
  const source = fs.readFileSync(path.join(admin, 'src', file), 'utf8');
  const sfc = compiler.parseComponent(source);
  assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
  const { code } = babel.transformSync(sfc.script.content, { babelrc: false, configFile: false,
    plugins: [require(path.join(admin, 'node_modules/@babel/plugin-transform-modules-commonjs'))] });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, console, Promise,
    require: name => imports[name] || {} });
  return module.exports.default;
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); await Vue.nextTick(); };
async function storage() {
  let rejectSave;
  const calls = [], errors = [];
  const page = component('pages/setting/storage/index.vue', { '@/api/setting': {
    storageConfigApi: async () => ({ data: { type: 1 } }),
    positionInfoApi: async () => ({ data: { watermark_position: 1, image_thumb_status: 0 } }),
    saveType: type => { calls.push(type); return new Promise((resolve, reject) => { rejectSave = reject; }); },
  } });
  const app = new Vue({ ...page, beforeCreate() { this.$message = { success() {}, error: msg => errors.push(msg) }; } });
  await flush();
  assert.equal(app.storageType, '1', 'Storage mode must survive loading thumbnail settings');
  const observed = [];
  app.$watch('storageType', value => observed.push(value));
  app.storageType = '5';
  const saving = app.changeSave('5');
  await flush();
  assert.deepEqual(observed, ['5'], 'Selection is reactive in Vue 2');
  assert.deepEqual(calls, ['5']);
  await app.getposition();
  assert.equal(app.storageType, '5', 'An unrelated settings response cannot reset the selection');
  rejectSave({ msg: '请先配置存储空间' });
  await saving;
  await flush();
  assert.equal(app.storageType, '1', 'Rejected save restores the confirmed server mode');
  assert.equal(app.storageSaving, false);
  assert.deepEqual(errors, ['请先配置存储空间']);
  app.$destroy();
  console.log('PASS: storage selection stays reactive, independent and rolls back failed saves');
}
function sharedConfig(name = 'categoryPageConfig') {
  const { code } = babel.transformSync(fs.readFileSync(path.resolve(admin, '../shared/' + name + '.js'), 'utf8'), {
    babelrc: false, configFile: false, plugins: [require(path.join(admin, 'node_modules/@babel/plugin-transform-modules-commonjs'))],
  });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: id => sharedConfig(id.replace('./', '')) });
  return module.exports;
}
async function category() {
  const config = sharedConfig(), saves = [], routes = [], messages = [];
  let failSave = false;
  const definition = component('pages/setting/theme/editTheme/components/CategoryEditor.vue', {
    '../../../../../../../shared/categoryPageConfig': config,
    '../../../../../../../shared/componentStyle': sharedConfig('componentStyle'),
    '../../../../../../../shared/navigationComponent': sharedConfig('navigationComponent'),
    '@/setting': { routePre: '/admin' },
    '@/api/diy': {
      themeInfo: async (_, type) => ({ data: type === 'category' ? '3' : { theme_color: '#123456', value: {} } }),
      themeSave: async (id, body) => { if (failSave) throw { msg: '保存失败测试' }; saves.push(JSON.parse(JSON.stringify(body))); return { data: { id: 8 } }; },
    },
  });
  const app = new Vue({ ...definition, beforeCreate() {
    this.$route = { query: { id: '8' } };
    this.$router = { push: route => routes.push(route) };
    this.$message = { success() {}, error: value => messages.push(value) };
  } });
  await flush();
  assert.equal(app.loading, false);
  assert.equal(app.centerVersion, 3);
  assert.equal(app.config.product_layout, 'list', 'Legacy layout 3 retains its list presentation');
  app.chooseVersion(1); app.config.show_recommend = 1; app.config.recommend_text = '精选';
  app.config.columns = 4; app.config.page_title = '我的分类'; app.config.background_repeat = 'repeat-y';
  await flush();
  assert.equal(await app.saveOnly(), true);
  assert.equal(saves[0].value.recommend_text, '精选');
  app.chooseVersion(2); app.config.buy_button_style = 8; app.config.price_color = '#112233';
  assert.equal(app.config.product_layout, 'large', 'Original style 2 starts with single-column large images');
  app.config.sub_tab_style = 'outline'; app.config.show_product_name = 0;
  assert.equal(await app.saveOnly(), true);
  assert.equal(saves[1].value.buy_button_style, 8);
  assert.equal(saves[1].value.page_title, '我的分类', 'Switching modules retains page settings');
  assert.equal(saves[1].value.layout_configs[1].columns, 4, 'Switching back to V1 can restore its own options');
  app.chooseVersion(3);
  assert.equal(app.config.product_layout, 'list');
  app.config.product_layout = 'grid';
  assert.equal(await app.saveOnly(), true);
  assert.equal(saves[2].value.status, 3, 'The third original layout remains individually selectable and saveable');
  assert.equal(saves[2].value.product_layout, 'grid', 'Style 3 supports custom presentation too');
  app.chooseVersion(2); app.chooseVersion(3);
  assert.equal(app.config.product_layout, 'grid');
  failSave = true;
  await app.saveAndClose();
  assert.deepEqual(routes, [], 'Failed save must leave the editor open');
  assert.equal(app.saving, false);
  assert.deepEqual(messages, ['保存失败测试']);
  failSave = false;
  await app.saveAndClose();
  assert.deepEqual(routes, ['/admin/setting/my_theme']);
  app.$destroy();
  console.log('PASS: category legacy load, V1/V2 and page settings persist, failed save cannot close the editor');
}
(async () => { await storage(); await category(); })().catch(error => { console.error(error); process.exitCode = 1; });
