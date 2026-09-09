const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// Run against the local H5 service with product 4's configured recommendations.
// Catches a lost recommendation list between the detail page and its DIY widgets.
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const delayed of ['product/detail/4', 'theme_info/detail']) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route(`**/api/${delayed}*`, async route => {
          const response = await route.fetch();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await route.fulfill({ response });
        });
        const detail = page.waitForResponse(response =>
          new URL(response.url()).pathname === '/api/product/detail/4');
        await page.goto('http://localhost:8011/pages/goods_details/index?id=4');
        const payload = await (await detail).json();
        assert.equal(payload.status, 200);
        const recommendations = payload.data.good_list;
        assert.ok(recommendations.length, 'Product 4 must have configured recommendations');
        await page.waitForLoadState('networkidle');
        const list = page.locator('.goodList .list').first();
        console.log(JSON.stringify({ delayed, expectedIds: recommendations.map(item => item.id),
          renderedLists: await list.count() }));
        await list.waitFor({ state: 'visible', timeout: 10000 }).catch(async error => {
          console.log(JSON.stringify(await page.evaluate(() => {
            const root = getCurrentPages().slice(-1)[0].$vm;
            const children = [];
            function inspect(vm) {
              if (vm.$options.name === 'goodList') children.push({
                list: vm.list, tempArr: vm.tempArr, typeConfig: vm.typeConfig,
              });
              vm.$children.forEach(inspect);
            }
            inspect(root);
            return { goodList: root.good_list, children, errors: document.body.innerText.slice(0, 300) };
          })));
          console.log(errors);
          throw error;
        });
        for (const item of recommendations) {
          assert.ok((await list.innerText()).includes(item.store_name),
            `Recommendation ${item.id} must be displayed`);
        }
        const target = recommendations.find(item => item.id !== 4);
        assert.ok(target, 'Fixture needs another product to verify navigation');
        await page.unrouteAll({ behavior: 'wait' });
        await list.getByText(target.store_name, { exact: true }).first().click();
        await page.waitForURL(url => url.pathname === '/pages/goods_details/index' &&
          url.searchParams.get('id') === String(target.id));
        assert.deepEqual(errors, []);
        console.log(`PASS: recommendations render and navigate with ${delayed} delayed`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
