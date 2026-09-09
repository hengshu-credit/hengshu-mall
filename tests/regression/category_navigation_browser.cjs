const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = 'http://localhost:8011';
const categoryPath = '/pages/goods_cate/goods_cate';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const layout of [1, 2, 3]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      async function swipe(x1, y1, x2, y2) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
        for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / 8, y: y1 + (y2 - y1) * i / 8 }],
        });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
      const errors = [], productQueries = [];
      page.on('pageerror', error => errors.push(error.stack || error.message));
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        let data;
        if (url.pathname === '/api/cart/count') data = { count: 0 };
        else if (url.pathname === '/api/v2/cart_list') data = [];
        else if (url.pathname === '/api/v2/get_today_coupon') data = { list: [] };
        else if (url.pathname === '/api/v2/new_coupon') data = { show: false, list: [] };
        else if (url.pathname === '/api/user') data = { uid: 1 };
        else if (url.pathname === '/api/theme_info/category') data = { status: String(layout) };
        else if (url.pathname === '/api/category') data = [
          { id: 1, cate_name: 'Category A', children: [{ id: 11, cate_name: 'Child A' }] },
          { id: 2, cate_name: 'Category B', children: [{ id: 21, cate_name: 'Child B1' }, { id: 22, cate_name: 'Child B2' }] },
        ];
        else if (url.pathname === '/api/products') {
          productQueries.push(Object.fromEntries(url.searchParams));
          data = [{ id: 4, store_name: `Products for ${url.searchParams.get('sid') || 0}`,
            price: '10.00', stock: 100, sales: 1, image: `${base}/statics/system_images/recommend_image.png`,
            spec_type: 0, activity: [], cart_num: 0 }];
        } else return route.continue({ headers: Object.fromEntries(Object.entries(route.request().headers())
          .filter(([, value]) => !value.includes('synthetic-category-navigation-token'))) });
        await route.fulfill({ json: { status: 200, data } });
      });
      await page.goto(`${base}/pages/index/index`, { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        getApp().$store.commit('LOGIN', { token: 'synthetic-category-navigation-token', time: 0 });
        getApp().$store.commit('SETUID', 1);
      });
      // Exercise the same link handler used by home-page category menu entries.
      await page.evaluate(() => getCurrentPages().slice(-1)[0].$vm.$util.JumpPath('/pages/goods/goods_list/index?sid=22&title=Child%20B2'));
      if (layout === 1) {
        await page.waitForURL(url => url.pathname === '/pages/goods/goods_list/index');
        assert.equal(new URL(page.url()).searchParams.get('sid'), '22', 'Directory layout keeps its product-list destination');
        await page.goBack({ waitUntil: 'networkidle' });
        await page.locator('.foot-item:visible').filter({ hasText: '分类' }).first().click();
        await page.waitForURL(url => url.pathname === categoryPath);
        await page.waitForFunction(() => getCurrentPages().slice(-1)[0]?.$vm?.$refs.classOne?.productList.length === 2);
        await swipe(330, 350, 130, 350);
        await page.waitForURL(url => url.pathname === '/pages/index/index');
        await page.waitForFunction(() => getCurrentPages().slice(-1)[0]?.$vm?.bindSortId);
        await page.evaluate(() => getCurrentPages().slice(-1)[0].$vm.$util.JumpPath('/pages/goods_cate/goods_cate?sid=22'));
        await page.waitForURL(url => url.pathname === categoryPath);
        await page.waitForFunction(() => getCurrentPages().slice(-1)[0]?.$vm?.$refs.classOne?.navActive === 1);
        assert.deepEqual(errors, []);
        console.log('PASS layout 1: product-list destination, footer history, swipe back and explicit category positioning');
        await context.close();
        continue;
      }
      await page.waitForURL(url => url.pathname === categoryPath, { timeout: 10000 });
      await page.getByText('Products for 22', { exact: true }).waitFor();
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByText('Products for 22', { exact: true }).waitFor();
      const selection = await page.evaluate(() => {
        const root = getCurrentPages().slice(-1)[0].$vm;
        const vm = root.$refs.classTwo || root.$refs.classThree;
        return { cid: vm.cid, sid: vm.sid, navActive: vm.navActive, selected: vm.categoryErList[vm.tabClick].id };
      });
      assert.deepEqual(selection, { cid: 2, sid: 22, navActive: 1, selected: 22 });
      assert.ok(productQueries.some(query => query.cid === '2' && query.sid === '22'));
      // Vertical scrolling and short horizontal movements must not navigate.
      await swipe(250, 400, 250, 250);
      await swipe(220, 350, 245, 350);
      assert.equal(new URL(page.url()).pathname, categoryPath);
      const tab = await page.locator('.longTab').first().boundingBox();
      await swipe(330, tab.y + tab.height / 2, 140, tab.y + tab.height / 2);
      assert.equal(new URL(page.url()).pathname, categoryPath, 'Horizontal tabs must keep their own gesture');
      // Left swipe goes back to the home page without destroying its history entry.
      await swipe(330, 350, 130, 350);
      await page.waitForURL(url => url.pathname === '/pages/index/index');
      await page.goForward({ waitUntil: 'networkidle' });
      await page.getByText('Products for 22', { exact: true }).waitFor();
      // Create a forward entry, return to categories, then swipe right to revisit it.
      await page.evaluate(() => uni.navigateTo({ url: '/pages/goods/goods_search/index' }));
      await page.waitForURL(url => url.pathname === '/pages/goods/goods_search/index');
      await page.goBack({ waitUntil: 'networkidle' });
      await page.getByText('Products for 22', { exact: true }).waitFor();
      await swipe(130, 350, 330, 350);
      await page.waitForURL(url => url.pathname === '/pages/goods/goods_search/index');
      await page.goBack({ waitUntil: 'networkidle' });
      await page.goBack({ waitUntil: 'networkidle' });
      await page.waitForURL(url => url.pathname === '/pages/index/index');
      await page.waitForFunction(() => getCurrentPages().slice(-1)[0]?.$vm?.bindSortId);
      await page.evaluate(() => getCurrentPages().slice(-1)[0].$vm.bindSortId({
        dataType: { tabVal: 1 }, classPage: { id: 21, name: 'Child B1' },
      }));
      await page.waitForURL(url => url.pathname === categoryPath);
      await page.getByText('Products for 21', { exact: true }).waitFor();
      assert.deepEqual(errors, []);
      console.log(`PASS layout ${layout}: child filter, history back/forward, gesture direction and scroll protection`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
