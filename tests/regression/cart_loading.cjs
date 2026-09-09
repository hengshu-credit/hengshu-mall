const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const Vue = require(path.join(root, 'template/admin/node_modules/vue'));
const Vuex = require(path.join(root, 'template/admin/node_modules/vuex'));
const babel = require(path.join(root, 'template/admin/node_modules/@babel/core'));
const { preprocess } = require(path.join(root, 'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
Vue.use(Vuex); Vue.config.productionTip = false; Vue.config.devtools = false;
const calls = [], tips = [];
let shown = 0, hidden = 0, active = 0, peak = 0;
const flush = async () => { for (let i = 0; i < 12; i++) await Vue.nextTick(); };
const request = (kind, params) => new Promise((resolve, reject) => {
  if (kind === 'list') { active++; peak = Math.max(peak, active); }
  calls.push({ kind, params, resolve(data) { if (kind === 'list') active--; resolve({ data }); }, reject(error) { if (kind === 'list') active--; reject(error); } });
});
const uni = { $on() {}, $off() {}, getStorageSync() {}, getWindowInfo: () => ({ statusBarHeight: 0 }), hideTabBar() {}, showLoading() { shown++; }, hideLoading() { hidden++; } };
const order = { getCartCounts: () => request('count'), getCartList: params => request('list', { ...params }) };
let source = fs.readFileSync(path.join(root, 'template/uni-app/pages/order_addcart/order_addcart.vue'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
source = preprocess(source, { H5: true }, { type: 'js' });
const { code } = babel.transformSync(source, { babelrc: false, configFile: false, plugins: [require(path.join(root, 'template/admin/node_modules/@babel/plugin-transform-modules-commonjs'))] });
const moduleObject = { exports: {} };
vm.runInNewContext(code, { module: moduleObject, exports: moduleObject.exports, uni, wx: { setTabBarBadge() {}, hideTabBarRedDot() {} }, getApp: () => ({ globalData: {} }), setTimeout, clearTimeout,
  require: id => id === 'vuex' ? Vuex : id === '@/api/order.js' ? order : id === '@/api/store.js' ? { getProductHot: () => Promise.resolve({ data: [] }) } : id === '@/utils/validate.js' ? { Throttle: fn => fn } : {},
});
const options = moduleObject.exports.default;
const store = new Vuex.Store({ getters: { isLogin: () => true }, modules: { indexData: { namespaced: true, state: { cartNum: 0 }, mutations: { setCartNum(state, n) { state.cartNum = n; } } } } });
function cart() {
  calls.length = 0; active = peak = shown = hidden = 0; tips.length = 0;
  return new Vue({ ...options, store, beforeCreate() { this.$t = text => text; this.$util = { Tips: value => tips.push(value), SplitArray: (next, previous) => previous.concat(next), $h: { Add: (a, b) => +a + +b, Mul: (a, b) => +a * +b } }; } });
}
const item = id => ({ id, product_id: id, cart_num: 2, truePrice: '10.00', attrStatus: true, productInfo: { stock: 9, attrInfo: { stock: 9 } } });
(async () => {
  const page = cart(); page.limit = 1;
  const done = page.getCartList(1);
  assert.equal(calls.filter(c => c.kind === 'list').length, 1, 'First cart page must start without waiting for counts');
  calls.find(c => c.kind === 'count').resolve({ count: 8, ids: [1, 2, 3, 4] });
  await flush();
  assert.equal(calls.filter(c => c.kind === 'list').length, 3, 'Start remaining pages with a maximum of three list requests');
  calls.find(c => c.params?.page === 3).resolve({ valid: [item(3)] });
  await flush();
  calls.find(c => c.params?.page === 4).resolve({ valid: [item(4)] });
  calls.find(c => c.params?.page === 2).resolve({ valid: [item(2)] });
  calls.find(c => c.params?.page === 1).resolve({ valid: [item(1)] });
  await done;
  assert.deepEqual(Array.from(page.cartList.valid, row => row.id), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(page.selectValue), [1, 2, 3, 4]);
  assert.equal(Number(page.selectCountPrice), 80);
  assert.equal(page.canShow, true); assert.equal(hidden, 1); assert.ok(peak <= 3);
  page.checkboxAllChange({ detail: { value: [] } }); assert.equal(Number(page.selectCountPrice), 0);
  page.checkboxAllChange({ detail: { value: ['all'] } }); assert.equal(Number(page.selectCountPrice), 80);
  page.$destroy();

  const empty = cart(); const emptyDone = empty.getCartList(1);
  calls.find(c => c.kind === 'count').resolve({ count: 0, ids: [] });
  await flush();
  assert.equal(empty.canShow, true, 'Empty cart must not wait for the speculative first page');
  calls.find(c => c.kind === 'list').resolve({ valid: [] }); await emptyDone; empty.$destroy();

  for (const failedKind of ['count', 'list']) {
    const failed = cart(); const settled = failed.getCartList(1);
    calls.find(c => c.kind === failedKind).reject('Test network failure');
    calls.find(c => c.kind !== failedKind).resolve(failedKind === 'count' ? { valid: [] } : { count: 1, ids: [1] });
    await settled;
    assert.equal(hidden, 1); assert.equal(failed.loading, false); assert.equal(tips.length, 1);
    failed.$destroy();
  }
  const mixed = cart(); const mixedDone = mixed.getCartList(1);
  calls.find(c => c.kind === 'count').resolve({ count: 4, ids: [1, 2] });
  calls.find(c => c.kind === 'list').resolve({ valid: [{ ...item(1), attrStatus: false }, { ...item(2), productInfo: { stock: 2, attrInfo: { stock: 2 } } }] });
  await mixedDone;
  assert.deepEqual(Array.from(mixed.selectValue), [2], 'Invalid specifications must remain unchecked');
  assert.equal(Number(mixed.selectCountPrice), 20);
  assert.equal(mixed.cartList.valid[1].numAdd, true, 'Stock limit must still disable increment');
  mixed.$destroy();

  const revisited = cart(); const abandoned = revisited.getCartList(1); const previous = [...calls];
  options.onHide.call(revisited); options.onShow.call(revisited);
  const current = calls.slice(previous.length);
  current.find(c => c.kind === 'count').resolve({ count: 2, ids: [2] });
  current.find(c => c.params?.status === 1).resolve({ valid: [item(2)] });
  current.find(c => c.params?.status === 0).resolve({ invalid: [] });
  await flush();
  assert.equal(revisited.cartList.valid[0].id, 2);
  const hiddenAfterRevisit = hidden;
  for (const call of previous) call.resolve(call.kind === 'count' ? { count: 99, ids: [99] } : { valid: [item(99)] });
  await abandoned;
  assert.equal(revisited.cartList.valid[0].id, 2, 'Prior visit must not overwrite current cart');
  assert.equal(revisited.cartCount, 2); assert.equal(hidden, hiddenAfterRevisit);
  revisited.$destroy();

  const oldPage = cart(); const oldDone = oldPage.getCartList(1); const stale = [...calls];
  options.onHide.call(oldPage);
  for (const call of stale) call.resolve(call.kind === 'count' ? { count: 1, ids: [1] } : { valid: [item(99)] });
  await oldDone;
  assert.equal(oldPage.cartList.valid.length, 0, 'A hidden page must ignore its pending responses');
  oldPage.$destroy();
  console.log('PASS: parallel cart bootstrap, bounded ordered pages, selection/totals, empty cart, failures and teardown');
})().catch(error => { console.error(error); process.exitCode = 1; });
