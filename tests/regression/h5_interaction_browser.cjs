const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const categories = [1, 2, 3].map(id => ({ id, cate_name: `Category ${id}`, pic: '/static/images/all_cat.png', children: [{ id: id * 10, cate_name: `Child ${id}`, pic: '/static/images/all_cat.png' }] }));
const product = (id, name) => ({ id, store_name: name, image: `/static/images/all_cat.png?fixture=${id}`, price: '10.00', sales: 1, stock: 0, min_qty: 1, cart_button: 1, spec_type: 0, activity: null });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    let layout = 1;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), name = url.pathname;
      let data;
      if (name === '/api/theme_info/category') data = { status: layout };
      else if (name === '/api/category_version') data = { version: 'interaction-fixture' };
      else if (name === '/api/category') data = categories;
      else if (name === '/api/cart/count') data = { count: 0 };
      else if (name === '/api/v2/cart_list') data = [];
      else if (name === '/api/v2/get_today_coupon') data = { list: [] };
      else if (name === '/api/v2/new_coupon') data = { show: false, list: [] };
      else if (name === '/api/user') data = { uid: 1 };
      else if (name === '/api/products') {
        if (url.searchParams.get('type') === '1') {
          const cid = Number(url.searchParams.get('cid'));
          await new Promise(resolve => setTimeout(resolve, cid === 2 ? 600 : 30));
          data = [product(cid, `Selected category ${cid}`)];
        } else data = [];
      } else if (name === '/api/product/hot') data = Array.from({ length: 40 }, (_, index) => product(100 + index, `Lazy image ${index}`));
      else {
        const headers = Object.fromEntries(Object.entries(route.request().headers()).filter(([, value]) => !value.includes('synthetic-interaction-token')));
        return route.continue({ headers });
      }
      await route.fulfill({ json: { status: 200, data } });
    });
    await page.goto('http://localhost:8011/pages/index/index', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      getApp().$store.commit('LOGIN', { token: 'synthetic-interaction-token', time: 0 });
      getApp().$store.commit('SETUID', 1);
    });
    for (layout = 1; layout <= 3; layout++) {
      await page.evaluate(() => new Promise((resolve, reject) => uni.reLaunch({ url: '/pages/goods_cate/goods_cate', success: resolve, fail: reject })));
      await page.waitForFunction(() => document.querySelectorAll('.aside .item').length === 3);
      if (layout === 1) {
        await page.locator('.aside .item').nth(2).click();
        await page.waitForFunction(() => getCurrentPages().slice(-1)[0].$vm.$refs.classOne.navActive === 2);
      } else {
        await page.getByText('Selected category 1', { exact: true }).waitFor();
        await page.locator('.aside .item').nth(1).click();
        await page.waitForTimeout(40);
        await page.locator('.aside .item').nth(2).click();
        await page.getByText('Selected category 3', { exact: true }).waitFor();
        await page.waitForTimeout(700);
        assert.equal(await page.getByText('Selected category 2', { exact: true }).count(), 0, 'Slow previous category must not replace current results');
        if (layout === 3) assert.ok(await page.evaluate(() => getCurrentPages().slice(-1)[0].$vm.$refs.classThree.scrollHeight > 0));
      }
    }
    await page.evaluate(() => {
      window.__imageLayoutReads = 0;
      const create = uni.createSelectorQuery;
      uni.createSelectorQuery = function () {
        const query = create.apply(this, arguments), select = query.select;
        query.select = function (selector) { if (selector.startsWith('#uid-')) window.__imageLayoutReads++; return select.apply(this, arguments); };
        return query;
      };
    });
    await page.evaluate(() => new Promise((resolve, reject) => uni.reLaunch({ url: '/pages/goods/goods_list/index', success: resolve, fail: reject })));
    await page.waitForFunction(() => document.querySelectorAll('.easy-loadimage').length === 40);
    await page.locator('.easy-loadimage').first().scrollIntoViewIfNeeded();
    await page.locator('.easy-loadimage').first().locator('.origin-img').waitFor();
    assert.ok(await page.locator('.easy-loadimage .origin-img').count() < 40, 'Offscreen images must remain deferred');
    await page.locator('.easy-loadimage').nth(15).scrollIntoViewIfNeeded();
    await page.locator('.easy-loadimage').nth(15).locator('.show-transition').waitFor();
    await page.evaluate(() => { window.__frames = []; window.__frameEnd = performance.now() + 1200; let previous; function frame(time) { if (previous) window.__frames.push(time - previous); previous = time; if (time < window.__frameEnd) requestAnimationFrame(frame); } requestAnimationFrame(frame); });
    for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, i % 2 ? -180 : 180); await page.waitForTimeout(80); }
    await page.waitForTimeout(450);
    const scroll = await page.evaluate(() => ({ imageLayoutReads: window.__imageLayoutReads, frames: window.__frames.length, p95FrameMs: [...window.__frames].sort((a, b) => a - b)[Math.floor(window.__frames.length * 0.95)] }));
    assert.equal(scroll.imageLayoutReads, 0);
    assert.deepEqual(errors, []);
    console.log('PASS: three category layouts, rapid selection, real lazy image loading and scrolling ' + JSON.stringify(scroll));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
