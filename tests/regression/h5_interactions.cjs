const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const label = process.argv[2] || 'after';
assert.match(label, /^[a-z-]+$/);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [], samples = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const fixtures = { '/api/cart/count': { count: 0 }, '/api/v2/cart_list': [], '/api/v2/get_today_coupon': { list: [] }, '/api/v2/new_coupon': { show: false, list: [] }, '/api/user': { uid: 1 } };
      if (pathname in fixtures) return route.fulfill({ json: { status: 200, data: fixtures[pathname] } });
      const headers = Object.fromEntries(Object.entries(route.request().headers()).filter(([, v]) => !v.includes('synthetic-interaction-token')));
      if (pathname === '/api/theme_info/category') {
        // Keep the baseline's layout while the developer edits the active theme.
        // Still measure the real layout API; override only the test browser response.
        const response = await route.fetch({ headers });
        const json = await response.json();
        assert.equal(json.status, 200);
        json.data.status = 2;
        return route.fulfill({ response, json });
      }
      return route.continue({ headers });
    });
    await page.goto('http://localhost:8011/pages/index/index', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      getApp().$store.commit('LOGIN', { token: 'synthetic-interaction-token', time: 0 });
      getApp().$store.commit('SETUID', 1);
      window.__listeners = new Map();
      const on = uni.$on, off = uni.$off;
      uni.$on = function (name, fn) { if (!window.__listeners.has(name)) window.__listeners.set(name, new Set()); window.__listeners.get(name).add(fn); return on.apply(this, arguments); };
      uni.$off = function (name, fn) { if (!name) window.__listeners.clear(); else if (!fn) window.__listeners.delete(name); else window.__listeners.get(name)?.delete(fn); return off.apply(this, arguments); };
      window.__longTasks = [];
      new PerformanceObserver(list => window.__longTasks.push(...list.getEntries().map(e => ({ start: e.startTime, ms: e.duration })))).observe({ type: 'longtask' });
    });
    for (let run = 1; run <= 3; run++) {
      await page.locator('.foot-item:visible').filter({ hasText: '分类' }).first().waitFor();
      await page.evaluate(() => { performance.clearResourceTimings(); window.__longTasks = []; window.__start = performance.now(); });
      await page.locator('.foot-item:visible').filter({ hasText: '分类' }).first().click();
      await page.waitForFunction(() => document.querySelectorAll('.aside .item').length > 0);
      const categoryReady = await page.evaluate(() => Math.round(performance.now() - window.__start));
      await page.waitForFunction(() => {
        const vm = getCurrentPages().slice(-1)[0].$vm;
        const child = vm.$refs.classTwo || vm.$refs.classThree;
        return child && child.page > 1 && !child.loading;
      });
      const data = await page.evaluate(() => ({
        productsReady: Math.round(performance.now() - window.__start),
        requests: performance.getEntriesByType('resource').filter(r => r.name.includes('/api/')).map(r => ({ path: new URL(r.name).pathname, start: Math.round(r.startTime - window.__start), ms: Math.round(r.duration) })),
        longTasks: window.__longTasks.map(e => Math.round(e.ms)),
        categoryLabels: [...document.querySelectorAll('.aside .item')].map(e => e.textContent.trim()),
      }));
      if (run === 1) await page.screenshot({ path: path.resolve(__dirname, '../../help/dev/.state', `interaction-${label}.png`) });
      await page.locator('.pageIndex').click();
      await page.locator('.foot-item:visible').filter({ hasText: '分类' }).first().waitFor();
      await page.waitForLoadState('networkidle');
      const listeners = await page.evaluate(() => Object.fromEntries(['ok', 'uploadCatData'].map(key => [key, window.__listeners.get(key)?.size || 0])));
      samples.push({ run, categoryReady, ...data, listeners });
    }
    const result = { layout: 2, samples, errors };
    fs.writeFileSync(path.resolve(__dirname, '../../help/dev/.state', `interaction-${label}.json`), JSON.stringify(result, null, 2));
    assert.deepEqual(errors, []);
    if (label === 'after') {
      assert.equal(samples[2].listeners.uploadCatData, 0, 'Destroyed category pages must not retain global refresh listeners');
      assert.equal(samples[2].listeners.ok, samples[0].listeners.ok, 'Theme listeners must not grow on repeated visits');
      const baseline = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../help/dev/.state/interaction-before.json')));
      assert.deepEqual(samples[0].categoryLabels, baseline.samples[0].categoryLabels, 'Category labels/order must be unchanged');
    }
    console.log(JSON.stringify(samples.map(({ run, categoryReady, productsReady, longTasks, listeners }) => ({ run, categoryReady, productsReady, longTasks, listeners }))));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
