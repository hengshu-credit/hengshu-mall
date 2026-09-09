// Fixed cart data/latency in an isolated browser; no real cart or order writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const label = process.argv[2] || 'after';
assert.match(label, /^[a-z-]+$/);
const state = path.resolve(__dirname, '../../help/dev/.state');
const row = id => ({ id, product_id: id, cart_num: 2, truePrice: '10.00', attrStatus: true, min_qty: 1,
  productInfo: { id, store_name: `Cart fixture ${id}`, image: '/static/images/all_cat.png', stock: 99, attrInfo: { stock: 99, image: '/static/images/all_cat.png', suk: 'Standard' } } });
const valid = Array.from({ length: 41 }, (_, i) => row(i + 1));
const invalid = [{ ...row(99), attrStatus: false }];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [], requests = [];
    let scenario = 'full';
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), name = url.pathname;
      let data;
      if (name === '/api/cart/count') {
        requests.push({ path: name, at: Date.now() });
        const currentScenario = scenario;
        await new Promise(resolve => setTimeout(resolve, 600));
        if (currentScenario === 'failure') return route.fulfill({ json: { status: 400, msg: 'Fixture count failure', data: {} } });
        data = currentScenario === 'empty' ? { count: 0, ids: [], sum_price: '0.00' } : { count: 84, ids: [...valid.map(item => item.id), 99], sum_price: '840.00' };
      } else if (name === '/api/cart/list') {
        requests.push({ path: name, page: url.searchParams.get('page'), status: url.searchParams.get('status'), at: Date.now() });
        const currentScenario = scenario;
        await new Promise(resolve => setTimeout(resolve, 800));
        const start = (Number(url.searchParams.get('page') || 1) - 1) * 20;
        data = currentScenario !== 'full' ? { valid: [], invalid: [] } : url.searchParams.get('status') === '0' ? { valid: [], invalid } : { valid: valid.slice(start, start + 20), invalid: [] };
      } else if (name === '/api/product/hot') data = [];
      else if (name === '/api/user') data = { uid: 1 };
      else if (name === '/api/v2/get_today_coupon' || name === '/api/v2/new_coupon') data = { list: [], show: false };
      else if (name.startsWith('/api/cart/') && route.request().method() !== 'GET') throw new Error('Test must not submit cart writes');
      else return route.continue({ headers: Object.fromEntries(Object.entries(route.request().headers()).filter(([, value]) => !value.includes('synthetic-cart-token'))) });
      return route.fulfill({ json: { status: 200, data } });
    });
    await page.goto('http://localhost:8011/pages/index/index', { waitUntil: 'networkidle' });
    await page.evaluate(() => { getApp().$store.commit('LOGIN', { token: 'synthetic-cart-token', time: 0 }); getApp().$store.commit('SETUID', 1); });
    const start = Date.now();
    await page.evaluate(() => { uni.switchTab({ url: '/pages/order_addcart/order_addcart' }); });
    try {
      await page.waitForFunction(() => { const vm = getCurrentPages().slice(-1)[0]?.$vm; return vm?.canShow && vm.cartList?.valid.length === 41; }, null, { timeout: 12000 });
    } catch (error) {
      fs.writeFileSync(path.join(state, `cart-${label}-error.json`), JSON.stringify({ errors, requests }, null, 2));
      throw new Error(error.message + '; page errors: ' + errors.join('; '));
    }
    const readyMs = Date.now() - start;
    await page.getByText('加载中', { exact: true }).waitFor({ state: 'hidden', timeout: 5000 });
    const interactiveMs = Date.now() - start;
    await page.waitForLoadState('networkidle');
    const snapshot = await page.evaluate(() => {
      const vm = getCurrentPages().slice(-1)[0].$vm;
      return { rows: vm.cartList.valid.map(item => [item.id, item.cart_num, item.truePrice, item.checked]), invalid: vm.cartList.invalid.map(item => item.id), selected: vm.selectValue, total: vm.selectCountPrice, count: vm.cartCount };
    });
    assert.equal(Number(snapshot.total), 820); assert.equal(snapshot.selected.length, 41); assert.deepEqual(snapshot.invalid, [99]);
    await page.screenshot({ path: path.join(state, `cart-${label}.png`) });
    const result = { readyMs, interactiveMs, errors, requests: requests.map(request => ({ ...request, at: request.at - start })), snapshot };
    fs.writeFileSync(path.join(state, `cart-${label}.json`), JSON.stringify(result, null, 2));
    assert.deepEqual(errors, []);
    if (label === 'after') assert.deepEqual(snapshot, JSON.parse(fs.readFileSync(path.join(state, 'cart-before.json'))).snapshot);
    console.log(JSON.stringify({ readyMs, interactiveMs, selected: snapshot.selected.length, total: snapshot.total, requests: result.requests }));
    if (label === 'after') {
      for (const next of ['empty', 'failure', 'full']) {
        await page.evaluate(() => { uni.switchTab({ url: '/pages/index/index' }); });
        await page.waitForFunction(() => getCurrentPages().slice(-1)[0]?.route === 'pages/index/index');
        scenario = next;
        await page.evaluate(() => { uni.switchTab({ url: '/pages/order_addcart/order_addcart' }); });
        await page.waitForFunction(expected => {
          const vm = getCurrentPages().slice(-1)[0]?.$vm;
          return vm?.canShow && !vm.loading && vm.cartList?.valid.length === expected;
        }, next === 'full' ? 41 : 0);
        await page.getByText('加载中', { exact: true }).waitFor({ state: 'hidden' });
        if (next === 'full') assert.equal(await page.evaluate(() => getCurrentPages().slice(-1)[0].$vm.selectCountPrice), 820);
      }
      assert.deepEqual(errors, []);
      console.log('PASS: empty cart, failed counts release loading, revisiting retries successfully');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
