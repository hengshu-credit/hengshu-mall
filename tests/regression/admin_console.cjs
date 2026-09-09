const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const admin = path.resolve(__dirname, '../../template/admin');
const Vue = require(path.join(admin, 'node_modules/vue'));
const Vuex = require(path.join(admin, 'node_modules/vuex'));
const babel = require(path.join(admin, 'node_modules/@babel/core'));
Vue.use(Vuex);
const warnings = [];
Vue.config.warnHandler = message => warnings.push(message);
const originalError = console.error;
console.error = (...args) => warnings.push(args.join(' '));
function load(file) {
  const script = fs.readFileSync(path.join(admin, 'src', file), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const { code } = babel.transformSync(script, { babelrc: false, configFile: false,
    plugins: [require(path.join(admin, 'node_modules/@babel/plugin-transform-modules-commonjs'))] });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, console,
    require(id) {
      if (id === 'vuex') return Vuex;
      if (id === '@/setting') return { apiBaseURL: '/adminapi/' };
      return {};
    } });
  return module.exports.default;
}
(async () => {
  load('pages/setting/theme/myTheme/index.vue');
  load('pages/setting/theme/components/themeSelect/index.vue');
  const store = new Vuex.Store({ modules: { mobildConfig: { namespaced: true, state: { defaultArray: [] } } } });
  const custom = new Vue({ ...load('components/mobilePage/home_custom_component.vue'), store });
  const config = JSON.parse(JSON.stringify(custom.defaultConfig));
  custom.setConfig(config);
  assert.equal(custom.bgColorLeft, '#fff');
  config.moduleColor.color[0].item = '#123456';
  custom.setConfig(config);
  assert.equal(custom.bgColorLeft, '#123456', 'Legacy background must still update');
  config.componentBgDataConfig = { tabVal: 0, colorConfig: { color: [{ item: '#111111' }, { item: '#222222' }] }, colorDirection: { tabVal: 1 } };
  assert.equal(custom.getDataWrapperStyle().background, 'linear-gradient(180deg, #111111 0%, #222222 100%)', 'New background settings must retain precedence');
  assert.deepEqual(warnings, [], 'Theme components must initialize without Vue/Vuex warnings');

  const coupon = '/admin/marketing/store_coupon_issue/index';
  const points = '/admin/marketing/point_statistic';
  const menus = [{ path: '/admin/marketing', title: '营销', children: [
    { path: coupon, title: '优惠券管理', children: [{ path: coupon, title: '优惠券列表' }] },
    { path: points, title: '积分管理', children: [{ path: points, title: '积分统计' }] },
  ] }, { path: '/elsewhere', title: '其他菜单', children: [{ path: coupon, title: '另一个入口' }] }];
  const state = Vue.observable({ route: { path: coupon }, menus });
  const breadcrumb = new Vue({ ...load('layout/navBars/breadcrumb/breadcrumb.vue'),
    beforeCreate() { this.$store = { state: { menus: { menusName: state.menus } } }; },
    computed: { ...load('layout/navBars/breadcrumb/breadcrumb.vue').computed, $route() { return state.route; } },
  });
  assert.equal(JSON.stringify(breadcrumb.breadcrumbItems.map(item => item.path)), JSON.stringify(['/admin/marketing', coupon]));
  assert.equal(breadcrumb.breadcrumbItems[1].title, '优惠券列表', 'Keep current leaf, not duplicate parent or unrelated branch');
  state.route.path = points;
  await Vue.nextTick();
  assert.equal(breadcrumb.breadcrumbItems[1].title, '积分统计');
  state.menus[0].children[1].children[0].title = '积分记录';
  assert.equal(breadcrumb.breadcrumbItems[1].title, '积分记录');
  state.route.path = '/missing';
  assert.equal(breadcrumb.breadcrumbItems.length, 0);
  custom.$destroy();
  breadcrumb.$destroy();
  console.log('PASS: theme initialization, legacy/new backgrounds, unique breadcrumb ancestry and reactive navigation');
})().catch(error => { originalError(error); process.exitCode = 1; }).finally(() => { console.error = originalError; });
