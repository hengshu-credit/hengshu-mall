const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const modules = path.join(root, 'template/admin/node_modules');
const babel = require(path.join(modules, '@babel/core'));
const { preprocess } = require(path.join(root, 'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
function load(file, globals, platform = { APP_PLUS: true }) {
  let source = fs.readFileSync(path.join(root, 'template/uni-app', file), 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  const code = babel.transformSync(preprocess(source, platform, { type: 'js' }), {
    babelrc: false, configFile: false,
    plugins: [require(path.join(modules, '@babel/plugin-transform-modules-commonjs'))],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: () => ({}), ...globals });
  return module.exports.default;
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function guideHarness(platform) {
  let now = 0, id = 0;
  const timers = new Map(), cache = new Map(), requests = [], routes = [];
  const options = load('pages/guide/index.vue', {
    setTimeout(fn, delay) { const key = ++id; timers.set(key, { fn, at: now + delay }); return key; },
    clearTimeout(key) { timers.delete(key); },
    uni: {
      getStorageSync: key => cache.get(key), setStorageSync: (key, value) => cache.set(key, value),
      switchTab: options => routes.push(options.url),
    },
    require: name => name === '@/api/api.js' ? {
      getOpenAdv(data, options) { return new Promise((resolve, reject) => requests.push({ options, resolve, reject })); },
    } : {},
  }, platform);
  const page = { ...options.data() };
  for (const [name, fn] of Object.entries(options.methods)) page[name] = fn.bind(page);
  return { page, requests, routes, cache, timers, options,
    show: () => options.onShow.call(page), hide: () => options.onHide.call(page),
    advance(ms) { now += ms; for (const [key, timer] of timers) if (timer.at <= now) { timers.delete(key); timer.fn(); } },
  };
}
(async () => {
  const strip = require(path.join(root, 'HBuilderX/plugins/uniapp-cli/node_modules/strip-json-comments'));
  const pagesSource = fs.readFileSync(path.join(root, 'template/uni-app/pages.json'), 'utf8');
  for (const platform of [{ APP_PLUS: true }, { H5: true }, { MP: true, MP_WEIXIN: true }]) {
    const pages = JSON.parse(strip(preprocess(pagesSource, platform, { type: 'js' })));
    assert.equal(pages.pages[0].path, 'pages/guide/index', 'Keep the configured advertisement entry');
    const diySplit = pages.subPackages.some(item => item.root === 'subpackage/diyComponents');
    assert.equal(diySplit, !platform.APP_PLUS, 'App tab pages need shared decoration components in the main bundle');
  }
  const disabled = guideHarness(); disabled.show();
  disabled.requests[0].resolve({ data: { status: 0, type: 'pic', value: [] } }); await flush();
  assert.deepEqual(disabled.routes, ['/pages/index/index']);
  assert.equal(disabled.page.guidePages, false);
  assert.equal(disabled.timers.size, 0);

  const slow = guideHarness(); slow.show();
  assert.equal(slow.requests[0].options.timeout, 1200);
  slow.advance(1199); assert.equal(slow.routes.length, 0);
  slow.advance(1); assert.equal(slow.routes.length, 1, 'Slow optional ads cannot hold up startup');
  slow.requests[0].resolve({ data: { status: 1, type: 'pic', value: [{ img: '/ad.png' }], time: 8 } }); await flush();
  assert.equal(slow.page.guidePages, false, 'Late ads cannot flash over the home page');
  assert.equal(slow.cache.has('guideDate'), false, 'A skipped ad must not be recorded as viewed');
  assert.equal(slow.routes.length, 1);

  for (const ad of [
    { status: 1, type: 'pic', value: [{ img: '/ad.png' }], time: 8 },
    { status: '1', type: 'video', value: [], video_link: '/ad.mp4', time: 12 },
  ]) {
    const enabled = guideHarness(); enabled.show(); enabled.requests[0].resolve({ data: ad }); await flush();
    assert.equal(enabled.page.guidePages, true);
    assert.equal(enabled.page.advData.time, ad.time, 'Keep the admin-configured display duration');
    enabled.advance(5000); assert.equal(enabled.routes.length, 0, 'The request deadline must not cut off a configured ad');
    assert.equal(enabled.cache.get('guideDate'), new Date().toLocaleDateString());
    enabled.hide(); assert.equal(enabled.page.guidePages, false);
  }
  const daily = guideHarness(); daily.cache.set('guideDate', new Date().toLocaleDateString()); daily.show();
  assert.equal(daily.requests.length, 0); assert.equal(daily.routes.length, 1);
  const failure = guideHarness(); failure.show(); failure.requests[0].reject(new Error('offline')); await flush();
  assert.equal(failure.routes.length, 1); assert.equal(failure.timers.size, 0);
  for (const data of [null, {}, { status: 1, type: 'pic', value: [] }, { status: 1, type: 'video' }]) {
    const empty = guideHarness(); empty.show(); empty.requests[0].resolve({ data }); await flush();
    assert.equal(empty.routes.length, 1, 'Invalid or empty ads must reach home');
  }
  const hidden = guideHarness(); hidden.show(); hidden.hide(); hidden.advance(2000);
  hidden.requests[0].reject(new Error('late error')); await flush(); assert.equal(hidden.routes.length, 0);
  hidden.show(); assert.equal(hidden.requests.length, 2);
  hidden.options.onUnload.call(hidden.page); assert.equal(hidden.timers.size, 0);
  for (const platform of [{ H5: true }, { MP: true, MP_WEIXIN: true }]) {
    const other = guideHarness(platform); other.show(); other.advance(2000);
    assert.equal(other.routes.length, 0); assert.equal(other.requests[0].options.timeout, undefined);
  }

  let closed = 0;
  const native = { navigator: { closeSplashscreen() { closed++; } } };
  const startup = load('mixins/appStartup.js', { plus: native });
  assert.equal(closed, 0, 'Do not hide the native splash before the first rendered page');
  startup.onReady(); startup.onReady(); assert.equal(closed, 1);
  load('mixins/appStartup.js', {}).onReady(); // non-native test/runtime guard

  let cleared = 0, nextInterval;
  const adComponent = load('components/guide/index.vue', {
    setInterval(fn) { nextInterval = fn; return 17; }, clearInterval(id) { assert.equal(id, 17); cleared++; },
  });
  let finished = 0;
  const adPage = { advData: { time: 8 }, launchFlag() { finished++; } };
  adComponent.methods.timer.call(adPage);
  for (let i = 0; i < 7; i++) nextInterval();
  assert.equal(finished, 0); nextInterval(); assert.equal(finished, 1);
  adComponent.beforeDestroy.call(adPage); assert.equal(cleared, 2);

  const sent = [];
  const request = load('utils/request.js', {
    uni: { getStorageSync() {}, request(options) { sent.push(options); } },
    require(name) {
      if (name === '@/config/app') return { HTTP_REQUEST_URL: 'https://store.test', HEADER: {}, TIMEOUT: 100000 };
      if (name === '../store') return { state: { app: {} } };
      return {};
    },
  });
  request.get('get_open_adv', {}, { noAuth: true, timeout: 1200 });
  request.get('products', {}, { noAuth: true });
  request.get('theme', {}, { noAuth: true, dedupe: true, timeout: 1200 });
  request.get('theme', {}, { noAuth: true, dedupe: true, timeout: 100000 });
  assert.deepEqual(sent.map(item => item.timeout), [1200, 100000, 1200, 100000]);
  console.log('PASS startup: first-render splash close, disabled/enabled/video ads, configured duration, daily skip, 1.2s deadline, late responses, cleanup, H5/MP behavior and request timeout isolation');
})().catch(error => { console.error(error); process.exitCode = 1; });
