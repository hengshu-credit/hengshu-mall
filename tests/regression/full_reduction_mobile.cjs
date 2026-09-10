const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { root, transform, compiler } = require('./theme_component_harness.cjs');
const { preprocess } = require(path.join(root, 'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function load(file, api) {
  const source = compiler.parseComponent(fs.readFileSync(path.join(root, 'template/uni-app', file), 'utf8')).script.content;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', 'uni', 'getApp', transform(preprocess(source, { H5: true }, { type: 'js' })))(mod, mod.exports,
    id => id === 'vuex' ? { mapGetters: () => ({}) } : id === '@/api/order.js' || id === '@/api/order' ? api : {},
    { getStorageSync() {}, getWindowInfo() { return {}; }, getSystemInfo() { return {}; }, showLoading() {}, hideLoading() {} }, () => ({ globalData: {} }));
  return mod.exports.default;
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function cartContext(api) {
  const options = load('pages/order_addcart/order_addcart.vue', api);
  return { ...options.methods, selectValue: ['1'], reductionRequestId: 0, reductionLoading: false, reductionError: '', fullReductionPrice: '0.00', selectCountPrice: 0, messages: [], $util: { Tips(message) { this.messages.push(message); }, messages: [] } };
}
test('cart uses server payable and requotes only selected IDs', async () => {
  const requests = [];
  const vm = cartContext({ getFullReductionQuote: async ids => { requests.push(ids); return { data: { pay_price: '85.00', full_reduction_price: '15.00' } }; } });
  vm.selectValue = [1, '2']; await vm.refreshReductionQuote();
  assert.deepEqual(requests, [['1', '2']]); assert.equal(vm.selectCountPrice, '85.00'); assert.equal(vm.fullReductionPrice, '15.00');
});
test('cart ignores stale selections and clears pending discounts when deselected', async () => {
  const requests = [];
  const vm = cartContext({ getFullReductionQuote: () => { const task = deferred(); requests.push(task); return task.promise; } });
  const first = vm.refreshReductionQuote(); vm.selectValue = ['2']; const second = vm.refreshReductionQuote();
  requests[1].resolve({ data: { pay_price: '20.00', full_reduction_price: '0.00' } }); await second;
  requests[0].resolve({ data: { pay_price: '85.00', full_reduction_price: '15.00' } }); await first;
  assert.equal(vm.selectCountPrice, '20.00');
  const pending = vm.refreshReductionQuote(); vm.selectValue = []; await vm.refreshReductionQuote();
  requests[2].resolve({ data: { pay_price: '100.00', full_reduction_price: '10.00' } }); await pending;
  assert.equal(vm.selectCountPrice, '0.00'); assert.equal(vm.fullReductionPrice, '0.00');
});
test('cart blocks checkout on quote failures and recovers with retry', async () => {
  let failure = true;
  const vm = cartContext({ getFullReductionQuote: async () => { if (failure) throw '网络错误'; return { data: { pay_price: '80.00', full_reduction_price: '20.00' } }; } });
  await vm.refreshReductionQuote(); assert.equal(vm.reductionError, '网络错误');
  vm.subOrder(); assert.equal(vm.$util.messages.length, 1);
  failure = false; await vm.refreshReductionQuote(); assert.equal(vm.reductionError, ''); assert.equal(vm.selectCountPrice, '80.00');
});
function confirmContext(api) {
  const options = load('pages/goods/order_confirm/index.vue', api);
  return { ...options.methods, pricingRequestId: 0, shippingType: 0, addressId: 1, useIntegral: false, couponId: 0, payType: 'yue', orderKey: 'test', priceGroup: {}, usable_integral: 100,
    $set: (object, key, value) => object[key] = value, $util: { Tips() { return 'blocked'; } } };
}
test('checkout keeps latest server quote and renders full reduction independently of coupons', async () => {
  const requests = [];
  const vm = confirmContext({ postOrderComputed: () => { const task = deferred(); requests.push(task); return task.promise; } });
  vm.computedPrice(); vm.couponId = 2; vm.computedPrice();
  requests[1].resolve({ data: { result: { pay_price: '72.00', full_reduction_price: '20.00', coupon_price: '8.00', deduction_price: 0, pay_postage: 0 } } }); await flush();
  requests[0].resolve({ data: { result: { pay_price: '80.00', full_reduction_price: '20.00', coupon_price: 0 } } }); await flush();
  assert.equal(vm.totalPrice, '72.00'); assert.equal(vm.full_reduction_price, '20.00'); assert.equal(vm.coupon_price, '8.00'); assert.equal(vm.pricingLoading, false);
});
test('checkout refuses submission until quote succeeds', async () => {
  const vm = confirmContext({ postOrderComputed: async () => { throw '不满足优惠券门槛'; } });
  vm.computedPrice(); assert.equal(vm.SubOrder(), 'blocked'); await flush();
  assert.equal(vm.pricingError, '不满足优惠券门槛'); assert.equal(vm.SubOrder(), 'blocked');
});
test('standalone category cart amount deducts per-line full reduction', () => {
  const options = load('components/categoryCheckout/index.vue', {});
  assert.equal(options.computed.currentAmount.call({ standalone: true, cartItems: [{ truePrice: '33.33', cart_num: 3, full_reduction_price: '20.00' }, { truePrice: '50.01', cart_num: 1, full_reduction_price: '10.00' }] }), '120.00');
});

test('initial confirmation quotes promotions with no address and no coupon', async () => {
  let computations = 0;
  const options = load('pages/goods/order_confirm/index.vue', { orderConfirm: async () => ({ data: {
    userInfo: { real_name: '', record_phone: '0', phone: '', now_money: 0 }, custom_form: [], usable_integral: 0,
    cartInfo: [], priceGroup: { totalPrice: 100, storePostage: 0, vipPrice: 0 }, orderKey: 'test', valid_count: 1,
  } }) });
  const vm = { ...options.methods, addressId: 0, shippingType: 0, is_gift: 0, cartArr: [{}, {}, {}, {}, {}],
    $t: text => text, $set: (object, key, value) => object[key] = value,
    $util: { $h: { Add: (a, b) => a + b }, Tips(message) { throw new Error(String(message.title)); } },
    getBargainId() {}, getCouponList() {}, computedPrice() { computations++; },
  };
  vm.getConfirm(); await flush(); assert.equal(computations, 1);
});
