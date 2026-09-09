const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const response = await context.request.get('http://localhost:8011/api/theme/navigation');
    const config = (await response.json()).data;
    assert.ok(config.menuList.length);
    let enabled = true, floating = false;
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      const fixtures = {
        '/api/cart/count': { count: 1, ids: [1001] },
        '/api/cart/list': { valid: [{ id: 1001, product_id: 4, cart_num: 1, attrStatus: true, status: true, truePrice: '10.00',
          productInfo: { id: 4, store_name: 'Navigation cart fixture', price: '10.00', stock: 100,
            image: 'http://localhost:8011/statics/system_images/recommend_image.png' } }], invalid: [] },
        '/api/v2/cart_list': [],
        '/api/v2/get_today_coupon': { list: [] }, '/api/v2/new_coupon': { show: false, list: [] },
        '/api/user': { uid: 1, nickname: 'Navigation test', orderStatusNum: {} }, '/api/user/set_visit': {},
      };
      if (pathname in fixtures) return route.fulfill({ json: { status: 200, data: fixtures[pathname] } });
      return route.continue({ headers: Object.fromEntries(Object.entries(route.request().headers())
        .filter(([, value]) => !value.includes('synthetic-store-navigation-token'))) });
    });
    await page.route('**/api/theme/navigation*', route => route.fulfill({ json: { status: 200,
      data: enabled ? { ...config, navConfig: { ...config.navConfig, tabVal: floating ? 1 : 0 } } : [],
    } }));
    const dock = page.locator('.store-navigation .footer-dock');
    await page.goto('http://localhost:8011/pages/index/index', { waitUntil: 'networkidle' });
    await dock.waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await page.locator('.page-footer:visible').count(), 1, 'Exactly one shared navigation');
    const scrollTo = async top => {
      await page.evaluate(top => window.scrollTo(0, top), top);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    };
    for (const top of [60, 130]) {
      await scrollTo(top);
      assert.equal(await dock.evaluate(element => element.classList.contains('is-collapsed')), false,
        'Light scrolling near the top must keep navigation visible');
    }
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForFunction(() => document.querySelector('.store-navigation .footer-dock')?.classList.contains('is-collapsed'));
    await page.evaluate(() => window.scrollTo(0, 560));
    await page.waitForFunction(() => !document.querySelector('.store-navigation .footer-dock')?.classList.contains('is-collapsed'));
    await scrollTo(620);
    assert.equal(await dock.evaluate(element => element.classList.contains('is-collapsed')), false,
      'A small downward correction after revealing navigation must not hide it again');
    await scrollTo(720);
    await page.waitForFunction(() => document.querySelector('.store-navigation .footer-dock')?.classList.contains('is-collapsed'));
    await page.evaluate(() => window.scrollTo(0, 0));
    // A real input also covers pages whose search UI navigates to a separate form.
    await page.evaluate(() => { const input = document.createElement('input'); input.id = 'navigation-keyboard-fixture'; document.querySelector('uni-page-body').appendChild(input); input.focus({ preventScroll: true }); });
    await page.waitForFunction(() => document.querySelector('.store-navigation .footer-dock')?.classList.contains('is-collapsed'));
    await page.locator('#navigation-keyboard-fixture').blur();
    await page.waitForFunction(() => !document.querySelector('.store-navigation .footer-dock')?.classList.contains('is-collapsed'));
    await page.locator('#navigation-keyboard-fixture').evaluate(element => element.remove());
    console.log('PASS: home navigation, down/up scrolling and keyboard');
    await page.evaluate(() => {
      getApp().$store.commit('LOGIN', { token: 'synthetic-store-navigation-token', time: 0 });
      getApp().$store.commit('SETUID', 1);
    });
    for (const path of ['/pages/order_addcart/order_addcart', '/pages/user/index']) {
      console.log('CHECK:', path);
      await page.goto('http://localhost:8011' + path, { waitUntil: 'networkidle' });
      await dock.waitFor({ state: 'visible' });
      assert.equal(await page.locator('.page-footer:visible').count(), 1, path);
      assert.equal(await page.locator('.foot-item[aria-current="page"]').count(), 1);
      if (path.includes('order_addcart')) {
        const action = page.locator('.shoppingCart .footer');
        await action.waitFor();
        await page.waitForFunction(() => {
          const action = document.querySelector('.shoppingCart .footer').getBoundingClientRect();
          const nav = document.querySelector('.store-navigation .footer-dock').getBoundingClientRect();
          return action.bottom <= nav.top + 2;
        });
      }
    }
    for (const path of ['/pages/goods_cate/goods_cate', '/pages/goods/goods_list/index', '/pages/columnGoods/HotNewGoods/index?type=1', '/pages/goods_details/index?id=4']) {
      console.log('CHECK:', path);
      await page.goto('http://localhost:8011' + path, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('.page-footer:visible').count(), 0, path);
      assert.equal(await page.locator('#right-nav').count(), 0);
      if (path.includes('goods_details')) {
        const action = page.locator('.product-con .footer.eject');
        await action.waitFor();
        for (const label of ['客服', '店铺', '收藏', '购物车', '加入购物车', '立即购买']) await action.getByText(label, { exact: true }).waitFor();
        const rect = await action.boundingBox();
        assert.ok(rect.x >= -1 && rect.x + rect.width <= 391);
        assert.ok(rect.y + rect.height <= 845);
        assert.equal(await page.locator('.detail-back-top').count(), 0);
        await page.evaluate(() => window.scrollTo(0, 700));
        await page.getByRole('button', { name: '回到顶部' }).waitFor();
        await page.getByRole('button', { name: '回到顶部' }).click();
        await page.waitForFunction(() => window.scrollY <= 1);
        assert.equal(await page.locator('.detail-back-top').count(), 0);
        await page.screenshot({ path: 'help/dev/.state/product-bottom-navigation.png' });
        await page.setViewportSize({ width: 320, height: 740 });
        const buttons = await action.locator('.btn-box button').evaluateAll(elements => elements.map(element => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: element.clientWidth, content: element.scrollWidth };
        }));
        assert.ok(buttons.every(button => button.left >= 0 && button.right <= 321 && button.content <= button.width + 1),
          'Purchase buttons must fit on narrow screens');
        await page.setViewportSize({ width: 390, height: 844 });
      }
    }
    console.log('PASS: cart/profile tabs; category, lists and details excluded; product actions and back to top');
    floating = true;
    await page.goto('http://localhost:8011/pages/index/index', { waitUntil: 'networkidle' });
    await dock.waitFor({ state: 'visible' });
    assert.equal(await page.locator('.page-footer:visible').count(), 1);
    enabled = false;
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.page-footer:visible').count(), 0, 'No decoration module means no shared navigation');
    assert.equal(await page.locator('#right-nav').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: floating style and disabled decoration');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
