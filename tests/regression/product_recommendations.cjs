const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');
const root = path.resolve(__dirname,'../..');
process.env.CRMEB_AUDIT_PORT='18126';
process.env.CRMEB_AUDIT_H5=path.join(root,'.build/storefront-hardening/h5');
process.env.CRMEB_AUDIT_OFFLINE='1';
const {createServer}=require('./storefront_audit_fixture.cjs');

// Current production H5 with isolated recommendation data; no running mall or hardcoded catalog product is required.
// Catches a lost recommendation list between the detail page and its DIY widgets.
(async () => {
  const fixture=await createServer();
  const recommended={...fixture.catalog[0],id:2,store_name:'回归推荐商品'};
  fixture.product.good_list=[recommended]; fixture.catalog.push(recommended);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const delayed of ['product/detail/1', 'theme_info/detail']) {
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
          new URL(response.url()).pathname === '/api/product/detail/1');
        await page.goto(fixture.origin+'/pages/goods_details/index?id=1');
        const payload = await (await detail).json();
        assert.equal(payload.status, 200);
        const recommendations = payload.data.good_list;
        assert.ok(recommendations.length, 'Isolated product must have configured recommendations');
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
        const target = recommendations.find(item => item.id !== 1);
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
    await new Promise(resolve=>fixture.server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
