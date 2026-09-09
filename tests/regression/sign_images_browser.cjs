const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const gate = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const configGate = gate(), imageGate = gate(), replacementGate = gate();
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let signStarted = false, failImage = true, themeMode = 'success';
    await page.route('**/api/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const fixtures = {
        '/api/sign/user': {}, '/api/sign/list': [],
        '/api/sign/config': { signStatus: 1, signMode: 1, signList: [[1, 2, 3, 4, 1, 2, 3].map(type => ({ type, point: 10, is_sign: false }))],
          nextContinuousDays: 2, nextCumulativeDays: 5, continuousSignDays: 0, signRemindSwitch: 0,
          checkSign: 0, signRemindStatus: 0, cumulativeSignDays: 0 },
        '/api/cart/count': { count: 0 }, '/api/user': { uid: 1, nickname: 'Image fixture', orderStatusNum: {} },
        '/api/user/set_visit': {}, '/api/v2/get_today_coupon': { list: [] }, '/api/v2/new_coupon': { show: false, list: [] },
      };
      if (pathname.includes('/sign/integral')) throw new Error('This test must never sign in for a real user');
      if (pathname.endsWith('/color_change/color_change') && signStarted) {
        await configGate.promise;
        return route.fulfill({ json: themeMode === 'failure' ? { status: 400, msg: 'Theme fixture unavailable' } :
          { status: 200, data: { status: themeMode === 'invalid' ? 'invalid' : 3 } } });
      }
      if (pathname in fixtures) return route.fulfill({ json: { status: 200, data: fixtures[pathname] } });
      return route.continue({ headers: Object.fromEntries(Object.entries(route.request().headers())
        .filter(([, value]) => !value.includes('synthetic-image-token'))) });
    });
    await page.route('**/statics/images/sgin_tip_*.png*', async route => {
      if (route.request().url().includes('replacement')) await replacementGate.promise;
      else await imageGate.promise;
      return failImage ? route.fulfill({ status: 404, body: '' }) : route.fulfill({
        contentType: 'image/png', path: path.join(root, 'crmeb/public/statics/images/sgin_tip_3.png'),
      });
    });
    await page.route('**/statics/images/sgin_icon_*.png', route => route.fulfill({ status: 404, body: '' }));
    await page.goto('http://localhost:8011/pages/index/index', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      getApp().$store.commit('LOGIN', { token: 'synthetic-image-token', time: 0 });
      getApp().$store.commit('SETUID', 1);
    });
    signStarted = true;
    await page.goto('http://localhost:8011/pages/users/user_sgin/index', { waitUntil: 'domcontentloaded' });
    await page.locator('.sign .headerCon').waitFor();
    async function assertNoBrokenImages(label) {
      const broken = await page.locator('.sign img').evaluateAll(images => images.filter(img => {
        if (img.naturalWidth > 0) return false;
        const rect = img.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        for (let el = img; el; el = el.parentElement) {
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        }
        return true;
      }).map(img => img.getAttribute('src')));
      assert.deepEqual(broken, [], label);
    }
    await assertNoBrokenImages('Waiting for theme configuration must not display empty/broken image elements');
    const title = page.locator('.sign-title-image');
    const initial = await title.boundingBox();
    configGate.release();
    await title.locator('.loading-img').waitFor({ state: 'visible' });
    assert.notEqual(await title.locator('.loading-img').evaluate(element => getComputedStyle(element, '::after').animationName), 'none');
    await assertNoBrokenImages('Pending image requests must keep the original image hidden');
    await page.screenshot({ path: 'help/dev/.state/sign-image-loading.png' });
    imageGate.release();
    await title.locator('.loadfail-img').waitFor({ state: 'visible' });
    await assertNoBrokenImages('404 title and reward icons must show a fallback');
    assert.equal(await title.locator('.loading-img:visible').count(), 0, 'Failure must stop loading animation');
    assert.deepEqual(await title.boundingBox(), initial, 'Loading and failure must preserve the title layout');
    await page.screenshot({ path: 'help/dev/.state/sign-image-fallback.png' });
    failImage = false;
    await page.reload({ waitUntil: 'networkidle' });
    await title.locator('.origin-img').waitFor({ state: 'visible' });
    await assertNoBrokenImages('Successful image loading');
    assert.equal(await title.locator('.loading-img:visible, .loadfail-img:visible').count(), 0);
    await page.evaluate(() => { const pages = getCurrentPages(); pages[pages.length - 1].$vm.sginTip += '?replacement=1'; });
    await title.locator('.loading-img').waitFor({ state: 'visible' });
    assert.equal(await title.locator('.origin-img:visible').count(), 0, 'A changed image must wait for its own load event');
    await assertNoBrokenImages('Changing an already loaded image');
    replacementGate.release();
    await title.locator('.origin-img').waitFor({ state: 'visible' });
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.sign-title-image .origin-img')).opacity) === 1);
    await page.screenshot({ path: 'help/dev/.state/sign-image-loaded.png' });
    for (themeMode of ['failure', 'invalid']) {
      await page.reload({ waitUntil: 'networkidle' });
      await title.locator('.origin-img').waitFor({ state: 'visible' });
      assert.match(await title.locator('.origin-img img').getAttribute('src'), /sgin_tip_3\.png$/);
      await assertNoBrokenImages('Unavailable or invalid theme configuration must use a valid fallback');
    }
    // Open only the visual reward popup; do not submit a check-in request.
    await page.evaluate(() => { const pages = getCurrentPages(); pages[pages.length - 1].$vm.active = true; });
    await page.locator('.signTip.on .signHeight .origin-img').waitFor({ state: 'visible' });
    await assertNoBrokenImages('The bundled success illustration must resolve from the nested page');
    assert.deepEqual(errors, []);
    console.log('PASS: sign image configuration delay, loading, 404 fallback, success and source replacement; no broken image visible');
  } finally {
    configGate.release(); imageGate.release(); replacementGate.release();
    await context.close(); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
