const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const admin = path.resolve(__dirname, '../../template/admin');
const { JSDOM } = require(path.join(admin, 'node_modules/jsdom'));
const dom = new JSDOM('<div id="app"></div>');
global.window = dom.window;
global.document = dom.window.document;
const Vue = require(path.join(admin, 'node_modules/vue'));
Vue.config.productionTip = false;
Vue.config.devtools = false;
const file = path.join(admin, 'src/layout/navBars/tagsView/tagsView.vue');
const script = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const babel = require(path.join(admin, 'node_modules/@babel/core'));
const { code } = babel.transformSync(script, { babelrc: false, configFile: false,
  plugins: [require(path.join(admin, 'node_modules/@babel/plugin-transform-modules-commonjs'))] });
const moduleObject = { exports: {} };
vm.runInNewContext(code, { module: moduleObject, exports: moduleObject.exports, window,
  require(request) {
    if (request === 'vuex') return require(path.join(admin, 'node_modules/vuex'));
    if (request === '@/setting') return { routePre: '/admin' };
    return {}; // Page components/storage are not involved in resize lifecycle.
  } }, { filename: file });
const errors = [];
Vue.config.errorHandler = error => errors.push(error);
window.addEventListener('error', event => { errors.push(event.error); event.preventDefault(); });
const bus = new Vue();
const Tags = Vue.extend({ ...moduleObject.exports.default,
  beforeCreate() {
    this.bus = bus;
    this.$route = { path: '/admin/index' };
    this.$store = { state: { app: { tagNavList: [{}] } } };
  },
  // Exercise the actual component hooks/methods with a minimal scrollbar child.
  render(h) { return h('div', { ref: 'tagsViews' }, [h({
    render(h) { return h('div', { ref: 'wrap' }); },
  }, { ref: 'scrollbarRef' })]); },
});
(async () => {
  const tags = new Tags().$mount('#app');
  Object.defineProperty(tags.$refs.tagsViews, 'offsetWidth', { value: 100 });
  Object.defineProperty(tags.$refs.scrollbarRef.$refs.wrap, 'scrollWidth', { value: 200 });
  window.dispatchEvent(new window.Event('resize'));
  assert.equal(tags.scrollTagIcon, true, 'Resize must still detect overflow while mounted');
  // A queued refresh and a resize after navigating away must not read dead refs.
  tags.refreshIcon();
  tags.$destroy();
  window.dispatchEvent(new window.Event('resize'));
  await Vue.nextTick();
  assert.equal(errors.length, 0, errors.map(error => error.message).join('\n'));
  console.log('PASS: tags resize before destruction and pending callbacks after destruction');
  dom.window.close();
})().catch(error => { console.error(error); process.exitCode = 1; dom.window.close(); });
