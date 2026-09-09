// Run against the live local source services: node dev_performance.cjs before|after
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const label = process.argv[2] || 'after';
assert.match(label, /^[a-z-]+$/);
const endpoints = ['/api/basic_config', '/api/theme_info/home', '/api/theme/navigation', '/api/copyright', '/adminapi/login/info'];
const hash = body => crypto.createHash('sha256').update(body).digest('hex');
(async () => {
  const result = { time: new Date().toISOString(), api: [], pages: [] };
  for (const endpoint of endpoints) {
    const times = [];
    const loginKeys = [];
    let body, response;
    for (let run = 0; run < 3; run++) {
      const start = performance.now();
      response = await fetch('http://localhost:8011' + endpoint);
      body = await response.text();
      assert.equal(response.status, 200);
      const payload = JSON.parse(body);
      assert.equal(payload.status, 200);
      if (endpoint === '/adminapi/login/info') {
        assert.equal(typeof payload.data.key, 'string');
        assert.ok(payload.data.key.length > 0);
        loginKeys.push(payload.data.key);
      }
      times.push(Math.round(performance.now() - start));
    }
    if (loginKeys.length) assert.equal(new Set(loginKeys).size, 3, 'Login configuration must still issue a fresh key per request');
    result.api.push({ endpoint, times, median: [...times].sort((a, b) => a - b)[1], hash: hash(body), freshLoginKeys: loginKeys.length ? true : undefined });
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const pathname of ['/pages/index/index', '/admin/']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const cache of ['cold', 'warm']) {
        await page.goto('http://localhost:8011' + pathname, { waitUntil: 'load' });
        await page.waitForTimeout(6500);
        const data = await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource');
          return {
            fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
            load: Math.round(performance.getEntriesByType('navigation')[0].loadEventEnd),
            bytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
            requests: resources.filter(r => /\/(api|adminapi)\//.test(r.name)).map(r => ({ path: new URL(r.name).pathname, start: Math.round(r.startTime), ms: Math.round(r.duration), end: Math.round(r.responseEnd) })),
            scripts: resources.filter(r => /\.js(?:\?|$)/.test(r.name)).map(r => ({ path: new URL(r.name).pathname, bytes: r.transferSize, decoded: r.decodedBodySize, ms: Math.round(r.duration) })),
          };
        });
        result.pages.push({ pathname, cache, ...data, errors: [...errors] });
        if (cache === 'cold') await page.screenshot({ path: path.join(root, 'help/dev/.state', `performance-${label}-${pathname.startsWith('/admin') ? 'admin' : 'h5'}.png`) });
      }
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(root, 'help/dev/.state', `performance-${label}.json`), JSON.stringify(result, null, 2));
  if (label === 'after') {
    const before = JSON.parse(fs.readFileSync(path.join(root, 'help/dev/.state/performance-before.json')));
    // Login info intentionally contains a newly generated authentication key.
    // Its freshness is tested above; only deterministic APIs allow byte hashes.
    for (const entry of result.api.filter(a => a.endpoint !== '/adminapi/login/info')) assert.equal(entry.hash, before.api.find(a => a.endpoint === entry.endpoint).hash, `API payload changed: ${entry.endpoint}`);
    for (const entry of result.pages) assert.deepEqual(entry.errors, before.pages.find(p => p.pathname === entry.pathname && p.cache === entry.cache).errors, 'New browser runtime errors');
  }
  console.log(JSON.stringify({ api: result.api.map(({ endpoint, median }) => ({ endpoint, median })), pages: result.pages.map(({ pathname, cache, fcp, bytes, requests }) => ({ pathname, cache, fcp, bytes, apiComplete: Math.max(...requests.map(r => r.end)), apiRequests: requests.length })) }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
