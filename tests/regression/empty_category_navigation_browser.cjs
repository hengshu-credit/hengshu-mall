const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const config = (await (await context.request.get('http://localhost:8011/api/theme/navigation')).json()).data;
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let result = [], enabled = true, fail = false, release;
    const product = { id: 4, store_name: 'Category navigation fixture', image: '/static/images/all_cat.png', price: '10.00', sales: 1 };
    await page.route('**/api/products?**', async route => {
      await new Promise(resolve => { release = resolve; });
      await route.fulfill({ json: fail ? { status: 400, msg: 'Fixture unavailable' } : { status: 200, data: result } });
    });
    await page.route('**/api/product/hot*', route => route.fulfill({ json: { status: 200, data: [product] } }));
    await page.route('**/api/theme/navigation*', route => route.fulfill({ json: { status: 200, data: enabled ? config : [] } }));
    const dock = page.locator('.store-navigation .footer-dock');
    async function waitForRequest() {
      await page.waitForFunction(() => typeof getCurrentPages === 'function' && getCurrentPages().slice(-1)[0]?.$vm.loading === true);
      for (let tries = 0; !release && tries < 100; tries++) await page.waitForTimeout(20);
      assert.ok(release, 'Products request must start');
    }
    async function finishRequest() {
      const resolve = release; release = null; resolve();
      await page.waitForFunction(() => getCurrentPages().slice(-1)[0].$vm.loading === false);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    async function open(query) {
      await page.goto('http://localhost:8011/pages/goods/goods_list/index?' + query, { waitUntil: 'domcontentloaded' });
      await waitForRequest();
      assert.equal(await dock.count(), 0, 'Loading is not a confirmed empty result');
      await finishRequest();
    }
    await open('sid=999999');
    await page.getByText('暂无商品，去看点别的吧', { exact: true }).waitFor();
    await dock.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('.page-footer:visible').count(), 1, 'Only one decoration footer');
    await page.getByText('Category navigation fixture', { exact: true }).waitFor();
    assert.equal(await dock.count(), 1, 'Recommended products do not change the empty filter result');
    // Same-page filtering must immediately clear the exception until the new response is known.
    result = [product];
    await page.locator('.nav .item').nth(1).click();
    await waitForRequest();
    await dock.waitFor({ state: 'detached' });
    await finishRequest();
    assert.equal(await dock.count(), 0, 'Nonempty results retain the normal list layout');
    result = [];
    await page.locator('.nav .item').nth(1).click();
    await waitForRequest(); await finishRequest();
    await dock.waitFor();
    await page.evaluate(() => uni.navigateTo({ url: '/pages/goods/goods_list/index?cid=888888' }));
    await waitForRequest();
    assert.equal(await dock.count(), 0, 'A new list page cannot inherit the previous empty state');
    result = [product]; await finishRequest();
    assert.equal(await dock.count(), 0);
    await page.evaluate(() => uni.navigateBack());
    await dock.waitFor({ state: 'visible' });
    result = []; await open('cid=999999'); await dock.waitFor();
    enabled = false; await open('sid=999999');
    await page.waitForLoadState('networkidle');
    assert.equal(await dock.count(), 0, 'No configured decoration means no footer');
    enabled = true; await open('searchValue=empty');
    assert.equal(await dock.count(), 0, 'The exception applies to category filters');
    fail = true; await open('sid=999999');
    await page.waitForLoadState('networkidle');
    assert.equal(await dock.count(), 0, 'Request failure is not an empty result');
    assert.deepEqual(errors, []);
    console.log('PASS: empty category footer, delayed loading, populated results, recommendations, history, missing decoration and failures');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
