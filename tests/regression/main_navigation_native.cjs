const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const modules = path.join(root, 'template/admin/node_modules');
const Vue = require(path.join(modules, 'vue'));
const Vuex = require(path.join(modules, 'vuex'));
const babel = require(path.join(modules, '@babel/core'));
const { preprocess } = require(path.join(root, 'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
Vue.use(Vuex); Vue.config.productionTip = false;
const transform = source => babel.transformSync(source, { babelrc: false, configFile: false,
  plugins: [require(path.join(modules, '@babel/plugin-transform-modules-commonjs'))] }).code;
const shared = { exports: {} };
new Function('module', 'exports', transform(fs.readFileSync(path.join(root, 'template/shared/mainNavigation.js'), 'utf8')))(shared, shared.exports);
const style = { exports: {} }, component = { exports: {} };
new Function('module', 'exports', transform(fs.readFileSync(path.join(root, 'template/shared/componentStyle.js'), 'utf8')))(style, style.exports);
new Function('module', 'exports', 'require', transform(fs.readFileSync(path.join(root, 'template/shared/navigationComponent.js'), 'utf8')))(component, component.exports, () => style.exports);
const events = new Vue(), cache = new Map(); let calls = 0, hidden = 0, measuredRect = { height: 82 };
const nav = { name: 'pageFoot', effectConfig: { tabVal: 1 }, navConfig: { tabVal: 0 }, navStyleConfig: { tabVal: 0 }, toneConfig: { tabVal: 1 },
  topConfig: { val: 0 }, bottomConfig: { val: 0 }, mbConfig: { val: 0 },
  bgColor: { color: [{ item: '#123456' }] }, txtColor: { color: [{ item: '#333333' }] }, activeTxtColor: { color: [{ item: '#FF0000' }] },
  mainNavigation: { visiblePages: ['/pages/goods_cate/goods_cate'], backgroundMode: 'system', corner: 24 },
  menuList: [{ name: '分类', link: '/pages/goods_cate/goods_cate', imgList: ['/static/selected.svg', '/static/normal.svg'] }],
};
const uni = { $on(name, callback) { assert.equal(typeof callback, 'function', `${name} listener must survive native lifecycle extraction`); return events.$on(name, callback); }, $off: events.$off.bind(events), hideTabBar() { hidden++; }, showTabBar() {},
  setStorageSync: (k, v) => cache.set(k, v), getStorageSync: k => cache.get(k),
  createSelectorQuery() { return { in() { return this; }, select() { return this; }, boundingClientRect(fn) { fn(measuredRect); return this; }, exec() {} }; },
};
function load(platform) {
  const script = fs.readFileSync(path.join(root, 'template/uni-app/components/pageFooter/index.vue'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const module = { exports: {} };
  vm.runInNewContext(transform(preprocess(script, platform, { type: 'js' })), { module, exports: module.exports, uni, setTimeout, clearTimeout,
    getCurrentPages: () => [{ route: 'pages/goods_cate/goods_cate' }],
    require: name => name.includes('shared/componentStyle') ? style.exports : name.includes('shared/mainNavigation') ? shared.exports : name === 'vuex' ? Vuex : name === '@/api/public.js' ? { getNavigation: async () => { calls++; return { data: nav }; } } : name === '@/config/app.js' ? { HTTP_REQUEST_URL: 'https://store.test' } : {},
  });
  const options = module.exports.default;
  // uni-app's native lifecycleMixin extracts these reserved method names before mounting.
  for (const hook of ['onPageShow', 'onPageHide', 'onPageResize']) {
    if (options.methods[hook]) { options[hook] = options.methods[hook]; delete options.methods[hook]; }
  }
  return options;
}
const store = new Vuex.Store({ getters: { isLogin: () => false, cartNum: () => 0 } });
const tick = async () => { for (let i = 0; i < 6; i++) await Vue.nextTick(); };
(async () => {
  for (const platform of [{ MP: true, MP_WEIXIN: true }, { APP_PLUS: true }]) {
    const options = load(platform), footer = new Vue({ ...options, store, propsData: { mainNavigationOnly: true } });
    const heights = []; footer.$on('heightChange', height => heights.push(height));
    options.mounted.call(footer); await footer.navigationInfo(); await tick();
    assert.equal(footer.renderNavigation, true);
    assert.equal(footer.activeIndex, 0);
    assert.equal(footer.footerHeight, 82);
    measuredRect = null; footer.measureFooter(); await tick();
    assert.equal(footer.footerHeight, 82, 'A delayed native view query must not erase the navigation clearance');
    measuredRect = { height: 82 }; footer.measureFooter();
    assert.equal(footer.componentStyle.background, '#FFFFFF');
    assert.equal(footer.componentStyle['border-radius'], '24px');
    assert.equal(footer.iconUrl('/uploads/icon.svg'), 'https://store.test/uploads/icon.svg');
    assert.equal(footer.iconUrl('/static/images/1-001.png'), '/static/images/1-001.png');
    footer.activePath = '/pages/user/index'; await tick();
    assert.equal(footer.renderNavigation, false); assert.equal(heights.at(-1), 0);
    footer.activePath = '/pages/goods_cate/goods_cate'; await tick();
    const legacy = { ...nav }; delete legacy.mainNavigation; footer.setNavigationInfo(legacy); await tick();
    assert.equal(footer.renderNavigation, false, 'Old category 2/3 themes retain their original footer visibility');
    footer.setNavigationInfo(nav); footer.setNavigationInfo([]); await tick();
    assert.equal(footer.renderNavigation, false, 'An empty theme clears any previously displayed footer');
    const perPage = component.exports.navigationComponent(nav);
    perPage.paddingConfig.val = 12; perPage.paddingConfig.isAll = false;
    footer.setNavigationInfo(perPage); footer.activePath = '/pages/goods_details/index'; await tick();
    assert.equal(footer.renderNavigation, true, 'page-scoped component renders on its configured detail page');
    assert.equal(footer.componentStyle.paddingTop, '24rpx');
    assert.equal(footer.footerHeight, 82);
    const scroll = top => events.$emit('theme-page-scroll', { path: '/pages/goods_details/index', top });
    perPage.scrollMode = 'always'; footer.setNavigationInfo(perPage);
    scroll(400); await tick(); assert.equal(footer.isCollapsed, false, 'Always-visible navigation stays available while scrolling');
    footer.setNavigationInfo({ ...perPage, scrollMode: 'smart' }); await tick();
    scroll(400); await tick(); assert.equal(footer.isCollapsed, true, 'Smart navigation hides after deliberate downward scrolling');
    assert.equal(heights.at(-1), 0, 'Action bars reclaim the hidden navigation height');
    scroll(340); await tick(); assert.equal(footer.isCollapsed, false, 'Smart navigation returns on upward scrolling');
    events.$emit('theme-page-scroll', { path: '/pages/user/index', top: 800 }); await tick();
    assert.equal(footer.isCollapsed, false, 'Inactive-page scroll events must not hide the current navigation');
    footer.setNavigationInfo({ ...perPage, scrollMode: 'always' }); scroll(900); await tick();
    assert.equal(footer.isCollapsed, false, 'Switching modes clears hidden state');
    footer.activePath = '/pages/goods_cate/goods_cate'; await tick();
    const beforeShow = calls;
    events.$emit('theme-page-show', { path: '/pages/goods_cate/goods_cate' }); await tick();
    assert(calls > beforeShow, 'Returning to a cached native page reloads its navigation configuration');
    footer.$destroy(); const before = calls; events.$emit('uploadFooter'); events.$emit('theme-page-show'); await tick(); assert.equal(calls, before, 'Destroyed footers release listeners');
  }
  assert(hidden > 0);
  console.log('PASS native footer: MP/APP visibility, safe-area height propagation, original icon URLs, legacy fallback and cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
