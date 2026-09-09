const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const babel = require(path.join(root, 'template/admin/node_modules/@babel/core'));
function load(file, globals = {}) {
  const source = fs.readFileSync(path.join(root, 'template/uni-app', file), 'utf8');
  const { code } = babel.transformSync(source, { babelrc: false, configFile: false, plugins: [require(path.join(root, 'template/admin/node_modules/@babel/plugin-transform-modules-commonjs'))] });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, ...globals });
  return module.exports;
}
const { createRouteHistory } = load('utils/appRouteHistory.js');
const home = '/pages/index/index', category = '/pages/goods_cate/goods_cate', cart = '/pages/order_addcart/order_addcart', user = '/pages/user/index';
const history = createRouteHistory();
[home, category, cart, user].forEach(url => history.visit(url));
assert.equal(history.current(), user);
for (const url of [cart, category, home]) {
  const move = history.plan(-1);
  assert.equal(move.url, url);
  history.commit(move);
}
assert.equal(history.plan(-1), null, 'Back at entry must not exit the app');
for (const url of [category, cart, user]) {
  const move = history.plan(1);
  assert.equal(move.url, url);
  history.commit(move);
}
assert.equal(history.plan(1), null);
const failed = history.plan(-1);
assert.equal(history.current(), user, 'Planning a failed navigation must not change the cursor');
history.commit(failed);
history.visit('/pages/goods/goods_search/index?keyword=a%26b');
assert.equal(history.plan(1), null, 'New navigation after Back discards the old forward branch');
assert.equal(history.current(), '/pages/goods/goods_search/index?keyword=a%26b');
const size = history.snapshot().entries.length;
history.visit(history.current());
assert.equal(history.snapshot().entries.length, size, 'Page onShow must not duplicate entries');
const stale = history.plan(-1);
history.visit(home);
assert.equal(history.commit(stale), false, 'Late completion cannot overwrite a newer visit');
assert.equal(history.current(), home);
assert.equal(history.planTo(cart).url, cart, 'Native application navigateBack can target an earlier history entry');
const bounded = createRouteHistory(4);
for (let i = 0; i < 8; i++) bounded.visit('/page?id=' + i);
assert.equal(bounded.snapshot().entries.length, 4);
assert.equal(bounded.snapshot().entries[0], '/page?id=0', 'Keep the session entry when bounding history memory');
console.log('PASS: APP tab history, Back/Forward, boundaries, query retention, branching and failed/stale navigation');

const { JSDOM } = require(path.join(root, 'template/admin/node_modules/jsdom'));
const dom = new JSDOM('<body><main></main><uni-swiper><div id="slide"></div></uni-swiper><input><div class="mask" style="display:none"></div></body>');
const { document, Event } = dom.window;
const dispatched = [];
const surface = load('utils/appHistorySurface.js', {
  document, window: {}, plus: { webview: { currentWebview: () => ({ id: 'test' }), postMessageToUniNView: value => dispatched.push(value.direction) } },
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
}).installHistorySurface;
surface({ canBack: true, canForward: true, busy: false });
surface({ canBack: true, canForward: true, busy: false });
assert.equal(document.querySelectorAll('nav,button').length, 0, 'History must not add visible navigation buttons');
const main = document.querySelector('main');
function event(target, type, x, y, count = 1) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'touches', { value: Array.from({ length: count }, () => ({ clientX: x, clientY: y })) });
  Object.defineProperty(e, 'changedTouches', { value: [{ clientX: x, clientY: y }] });
  target.dispatchEvent(e);
}
function swipe(target, dx, dy = 0) {
  event(target, 'touchstart', 150, 200);
  event(target, 'touchmove', 150 + dx, 200 + dy);
  event(target, 'touchend', 150 + dx, 200 + dy);
}
swipe(main, 110);
swipe(main, -110);
assert.deepEqual(dispatched, [-1, 1]);
swipe(main, 40);
swipe(main, 100, 200);
swipe(document.querySelector('#slide'), 110);
swipe(document.querySelector('input'), 110);
assert.equal(dispatched.length, 2, 'Short, vertical, carousel and input gestures must not navigate');
surface({ canBack: false, canForward: false, busy: false });
swipe(main, 110);
assert.equal(dispatched.length, 2, 'An unavailable direction must not issue a native navigation');
surface({ canBack: true, canForward: true, busy: true });
swipe(main, -110);
assert.equal(dispatched.length, 2, 'Rapid gestures during navigation must be ignored');
console.log('PASS: APP gesture direction, thresholds, local interactions, no added buttons and repeat installation');

// Run the actual APP adapter against native lifecycle ordering, including success after onShow.
let mixin, pages = [], interception, nativeCalls = [], nextFailure = false;
const nativeView = { id: 'test', evalJS() {}, setStyle() {} };
const nativeMessages = {};
function page(url) {
  const [route, query = ''] = url.split('?');
  const p = { route: route.slice(1), options: Object.fromEntries(new URLSearchParams(query)) };
  const component = { $scope: { $getAppWebview: () => nativeView }, $nextTick: cb => cb() };
  p.$vm = component;
  return p;
}
function show() { const p = pages[pages.length - 1]; p.$vm.attachAppHistory = mixin.methods.attachAppHistory; mixin.onShow.call(p.$vm); }
const nativeUni = { addInterceptor(name, handlers) { interception = handlers; }, showToast() {} };
for (const name of ['navigateTo', 'redirectTo', 'switchTab', 'reLaunch', 'navigateBack']) {
  nativeUni[name] = options => {
    nativeCalls.push({ name, url: options.url });
    if (name === 'navigateBack') interception.invoke(options);
    if (nextFailure) { nextFailure = false; options.fail?.(); return; }
    if (name === 'switchTab' || name === 'reLaunch') pages = [page(options.url)];
    else if (name === 'navigateBack') pages.splice(-options.delta);
    else if (name === 'redirectTo') pages.splice(-1, 1, page(options.url));
    else pages.push(page(options.url));
    show();
    options.success?.();
    options.complete?.();
  };
}
load('utils/installAppHistory.js', {
  require: name => name === './appRouteHistory' ? { createRouteHistory } : { installHistorySurface() {} },
  uni: nativeUni, getCurrentPages: () => pages, console: { log() {} },
  plus: { globalEvent: { addEventListener: (name, handler) => { nativeMessages[name] = handler; } } },
}).installAppHistory({ mixin(value) { mixin = value; } });
mixin.onLaunch();
pages = [page('/pages/guide/index')]; show();
pages = [page(home)]; show();
assert.equal(mixin.onBackPress(), true);
assert.equal(nativeCalls.length, 0, 'Entry Back must be consumed without native exit or navigation');
nativeUni.switchTab({ url: category });
nativeUni.switchTab({ url: cart });
nativeUni.switchTab({ url: user });
// APP can retain cached tab pages in getCurrentPages; they cannot be popped with navigateBack.
pages.unshift(page(cart));
mixin.onBackPress();
assert.equal(nativeCalls[nativeCalls.length - 1].name, 'switchTab', 'Cached tabs must be restored with switchTab, never navigateBack');
assert.equal('/' + pages[0].route, cart, 'Back from a cleared tab stack restores the previous tab');
mixin.onBackPress();
assert.equal('/' + pages[0].route, category);
nextFailure = true;
mixin.onBackPress();
assert.equal('/' + pages[0].route, category);
mixin.onBackPress();
assert.equal('/' + pages[0].route, home, 'Retry after native failure must use the same target');
nativeUni.switchTab({ url: category });
interception.invoke({ from: 'backbutton' });
mixin.onBackPress();
assert.equal('/' + pages[0].route, home, 'Android system Back passes through the API interceptor and must still be intercepted by page history');
const message = { type: 'wuse-route-history', pageId: 'test', direction: 1, requestId: 'one' };
nativeMessages.plusMessage({ data: message });
assert.equal('/' + pages[0].route, category, 'A swipe message from the current native view restores forward history');
nativeMessages.WebviewPostMessage({ data: { ...message, direction: -1 } });
assert.equal('/' + pages[0].route, category, 'Duplicate delivery across native channels must not navigate twice');
nativeMessages.plusMessage({ data: { ...message, pageId: 'hidden-page', direction: -1, requestId: 'two' } });
assert.equal('/' + pages[0].route, category, 'Messages from hidden or unrelated views must be ignored');
nativeMessages.plusMessage({ data: { ...message, direction: -1, requestId: 'three' } });
assert.equal('/' + pages[0].route, home);
console.log('PASS: native APP lifecycle adapter, tab stack destruction, Back handling and navigation failure recovery');
