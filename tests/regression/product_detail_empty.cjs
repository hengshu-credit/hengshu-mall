const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const deps = path.join(root, 'template/admin/node_modules');
const parser = require(path.join(deps, '@babel/parser'));
require(path.join(deps, 'jsdom-global'))();
const Vue = require(path.join(deps, 'vue/dist/vue.common.js'));
Vue.config.productionTip = false;
Vue.config.devtools = false;
const compile = require(path.join(deps, 'vue-template-compiler')).compileToFunctions;
let response, reject = true, requests = 0, tips = [], emitted = [];
const uni = { showLoading() {}, hideLoading() {}, setNavigationBarTitle() {}, getStorageSync() {} };
function readComponent(file, properties) {
  const full = fs.readFileSync(path.join(root, 'template/uni-app', file), 'utf8');
  const script = full.split('<script>')[1].split('</script>')[0];
  const ast = parser.parse(script, { sourceType: 'module' });
  const object = ast.program.body.find(n => n.type === 'ExportDefaultDeclaration').declaration;
  const code = object.properties.filter(p => properties.includes(p.key.name)).map(p => script.slice(p.start, p.end)).join(',');
  return { full, options: vm.runInNewContext('({' + code + '})', {
    uni, window: { location: { origin: '' } }, sysHeight: '0px', HTTP_REQUEST_URL: '', mapGetters: () => ({}),
    getProductDetail() { requests++; return reject ? Promise.reject(response) : Promise.resolve(response); },
    getThemeInfo() { return Promise.reject('主题加载失败'); },
    getCustomer() { emitted.push('customer'); },
  }) };
}
const detail = readComponent('pages/goods_details/index.vue', ['data', 'computed', 'methods']);
const flush = () => new Promise(setImmediate);
function page() {
  const p = { $t: s => s, $set: (o, k, v) => { o[k] = v; }, $nextTick: f => f(),
    $util: { Tips(...args) { tips.push(args); }, $h: { Sub: () => 0 } }, $store: { state: { app: {} } } };
  Object.assign(p, detail.options.data.call(p), detail.options.methods);
  p.id = 1;
  return p;
}
(async () => {
  for (const error of ['商品不存在', '商品已下架', { status: 1 }, null]) {
    response = error; reject = true; tips = [];
    const p = page();
    p.getGoodsDetails();
    await flush();
    assert.ok(tips.every(args => args.length < 2), 'A failed product request must never schedule Back or another navigation');
    assert.equal(p.detailStatus, 'error');
    assert.ok(p.detailError, 'Failure must leave an inline explanation');
  }
  reject = false; response = { data: { storeInfo: null } };
  const missing = page(); missing.getGoodsDetails(); await flush();
  assert.equal(missing.detailStatus, 'error', 'An empty success response must not expose purchase actions');
  const invalid = page(); invalid.id = undefined; const previousRequests = requests;
  invalid.getGoodsDetails(); await flush();
  assert.equal(requests, previousRequests, 'Missing IDs must not issue a product request');
  assert.equal(invalid.detailStatus, 'error');

  const retry = page(); reject = true; response = '商品不存在';
  retry.getGoodsDetails(); await flush();
  reject = false;
  response = { data: { storeInfo: { id: 1, store_name: '测试商品', price: 10 }, productAttr: [], productValue: {}, coupons: [] } };
  ['getImageBase64', 'downloadFilestoreImage', 'DefaultSelect', 'setRealPrice', 'getCartCount', 'getUserInfo', 'ShareInfo'].forEach(k => { retry[k] = () => {}; });
  const requestsBeforeRetry = requests;
  retry.getGoodsDetails(); retry.getGoodsDetails();
  await flush();
  assert.equal(requests, requestsBeforeRetry + 1, 'Repeated retry taps share the active load');
  assert.equal(retry.detailStatus, 'ready', 'Retry success restores product content: ' + retry.detailError);
  assert.equal(retry.detailError, '');
  assert.equal(retry.storeInfo.id, 1);
  await retry.getDiyData();

  const bottom = readComponent('subpackage/diyComponents/productBottom.vue', ['props', 'computed', 'methods']);
  const template = bottom.full.split('<template>')[1].split('</template>')[0];
  const rendered = new Vue({ ...bottom.options, ...compile(template),
    propsData: { commerceActions: true, noGoods: true, storeInfo: {}, unavailableText: '暂不可购买' },
    components: { commonWrapper: { render(h) { return h('div', this.$slots.default); } } },
    methods: { ...bottom.options.methods, $t: s => s },
  }).$mount();
  assert.ok(rendered.$el.classList.contains('eject'), 'The detail footer remains visible without a product');
  assert.match(rendered.$el.textContent, /客服.*店铺.*收藏.*购物车.*暂不可购买/s);
  assert.ok(rendered.$el.querySelector('button[disabled]'), 'Unavailable purchase action must be disabled');
  rendered.$on('setCollect', () => emitted.push('collect'));
  rendered.$on('goBuy', () => emitted.push('buy'));
  rendered.setCollect(); rendered.goBuy();
  assert.deepEqual(emitted, [], 'Unavailable product actions must not call business APIs');
  rendered.noGoods = false;
  rendered.storeInfo = { id: 1, cart_button: 1 };
  rendered.attr = { productSelect: { stock: 10 } };
  await Vue.nextTick();
  assert.match(rendered.$el.textContent, /加入购物车.*立即购买/s);
  rendered.setCollect(); rendered.goBuy();
  assert.deepEqual(emitted, ['collect', 'buy'], 'Valid product actions remain available');
  assert.ok(!detail.full.includes('<shareRedPackets'), 'Product detail must not mount the yellow commission float');
  rendered.$destroy();
  console.log('PASS: product errors stay on page, missing IDs, retry recovery, visible disabled footer and removed commission float');
})().catch(error => { console.error(error); process.exitCode = 1; });
