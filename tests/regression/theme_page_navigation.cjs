const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, modules, transform, compiler } = require('./theme_component_harness.cjs');
const Vue = require(path.join(modules, 'vue'));
const Vuex = require(path.join(modules, 'vuex'));
Vue.use(Vuex); Vue.config.productionTip = false;
const cache = {}, data = {}, writes = []; let failure = false;
function load(file) {
  file = path.resolve(root, file);
  if (cache[file]) return cache[file];
  const source = fs.readFileSync(file, 'utf8');
  const script = file.endsWith('.vue') ? compiler.parseComponent(source).script.content : source;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', transform(script))(m, m.exports, name => {
    if (name === 'vuex') return Vuex;
    if (name === '@/setting') return { apiBaseURL: 'http://127.0.0.1:8011/adminapi' };
    if (name === '@/api/diy') return { themeInfo: async (_, type) => ({ data: data[type] || { value: {} } }), themeSave: async (_, body) => { if (failure) throw { msg: '保存失败' }; writes.push(JSON.parse(JSON.stringify(body))); data[body.type] = JSON.parse(JSON.stringify(body.value)); return { data: { id: 42 }, msg: '成功' }; } };
    if (name.includes('shared/')) return load(path.resolve(path.dirname(file), name + '.js'));
    if (name.startsWith('./') && file.includes('shared')) return load(path.resolve(path.dirname(file), name + '.js'));
    return name === '@/components/mobilePage/index.js' ? { default: { main_navigation: load('template/admin/src/components/mobilePage/main_navigation.vue').default }, __esModule: true } : {};
  });
  return cache[file] = m.exports;
}
const options = load('template/admin/src/pages/setting/devise/diyIndex.vue').default;
const nav = load('template/admin/src/components/mobilePage/main_navigation.vue').default;
const moduleOptions = load('template/admin/src/store/module/mobildConfig.js').default;
const store = new Vuex.Store({ modules: { mobildConfig: moduleOptions } });
const tick = async () => { for (let n = 0; n < 8; n++) await Vue.nextTick(); };
function editor(type) {
  store.commit('mobildConfig/SETEMPTY');
  return new Vue({ store, data: () => ({ ...options.data(), pageType: type, pageId: 42, lConfig: [nav] }), computed: options.computed, methods: options.methods,
    beforeCreate() { this.$route = { query: { type, id: 42 } }; this.$router = { replace() {} }; this.$message = { warning() {}, success() {}, error() {} }; this.setDirty = value => this.dirty = value; },
  });
}
(async () => {
  for (const type of ['home', 'detail', 'user']) {
    const vm = editor(type); vm.getDefaultConfig(); await tick();
    assert.equal(vm.mConfig.length, 0);
    vm.addDomCon({ ...nav }, 1); await tick();
    vm.addDomCon({ ...nav }, 1); await tick();
    assert.equal(vm.mConfig.length, 1, 'only one navigation per page');
    let config = Object.values(store.state.mobildConfig.defaultArray)[0];
    config.mainNavigation.title = type; config.menuList[0].name = type;
    assert.equal(await vm.saveConfig(1), true);
    assert.equal(writes.at(-1).value.navigation_mode, 'page');
    vm.getDefaultConfig(); await tick();
    config = Object.values(store.state.mobildConfig.defaultArray).find(item => item.name === 'mainNavigation');
    if (!config) console.log({ type, saved: data[type], list: vm.mConfig, config: store.state.mobildConfig.defaultArray, loadError: vm.loadError });
    assert.equal(config.mainNavigation.title, type);
    let observed; vm.$watch(() => config.menuList[0].name, value => observed = value);
    config.menuList[0].name = '修改'; await tick(); assert.equal(observed, '修改', 'loaded configuration remains reactive');
    failure = true; assert.equal(await vm.saveConfig(1), false); failure = false;
    assert.equal(vm.loading, false);
    store.commit('mobildConfig/DEFAULTARRAY', {}); vm.mConfig = [];
    assert.equal(await vm.saveConfig(1), true, 'removing the final component is saveable');
    vm.getDefaultConfig(); await tick(); assert.equal(vm.mConfig.length, 0, 'deleted navigation stays deleted');
    vm.$destroy();
  }
  const parent = load('template/admin/src/pages/setting/theme/editTheme/index.vue').default;
  const context = { isDirty: false, changed: '', onSave: async () => false, handleMenuChange(key) { this.changed = key; } };
  await parent.methods.handleSidebarSave.call(context, 'detail'); assert.equal(context.changed, '');
  context.onSave = async () => true;
  await parent.methods.handleSidebarSave.call(context, 'detail'); assert.equal(context.changed, 'detail');
  console.log('PASS theme editor: home/detail/user navigation lifecycle, reactivity, duplicate prevention and save-before-switch');
})().catch(e => { console.error(e); process.exitCode = 1; });


