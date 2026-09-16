const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const root = path.resolve(__dirname, '../..');
process.env.CRMEB_AUDIT_PORT = '18146';
process.env.CRMEB_AUDIT_OFFLINE = '1';
process.env.CRMEB_AUDIT_H5 ||= path.join(root, '.build/storefront-hardening/h5');
const { chromium } = require(path.join(root, 'tests/tooling/node_modules/playwright'));
const { createServer } = require('./storefront_audit_fixture.cjs');
const { startMedia } = require('./commerce_fixture_services.cjs');
const cases = require('./cart_image_fixture.cjs');
const out = path.join(root, '.build/cart-category-images');
const baseline = process.argv.includes('--baseline');
const metrics = el => [...el.querySelectorAll('.pictrue')].map(box => {
  const img = box.querySelector('img'), rect = box.getBoundingClientRect();
  return { src: img && img.src, naturalWidth: img && img.naturalWidth, width: rect.width, height: rect.height };
});
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const media = await startMedia();
  const fixture = await createServer(cases);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [], errors = [];
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 430, height: 932 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (/\[system\].*(?:TypeError|ReferenceError)|Error in render/.test(message.text())) errors.push(message.text()); });
    await page.goto(fixture.origin + '/pages/index/index');
    await page.evaluate(() => { const app = getApp(); (app.$store || app.$vm.$store).commit('LOGIN', { token: 'audit-only', time: 0 }); });
    for (const [name, url, selector] of [
      ['category-cart', '/pages/goods_cate/goods_cate', '.category-cart-layer.is-open .cartList'],
      ['cart', '/pages/order_addcart/order_addcart', '.shoppingCart .cart-shop'],
    ]) {
      await page.goto(fixture.origin + url);
      if (name === 'category-cart') await page.locator('.category-checkout-dock .checkout-cart').click();
      const list = page.locator(selector).first();
      await list.waitFor();
      await list.getByText('失效规格图片', { exact: true }).first().waitFor();
      await page.waitForTimeout(1800);
      await list.scrollIntoViewIfNeeded();
      let images = await list.evaluate(metrics);
      await page.screenshot({ path: path.join(out, (baseline ? 'before-' : 'after-') + name + '.png') });
      results.push({ name, images });
      if (baseline) assert(images.some(image => !image.naturalWidth), 'Baseline must reproduce the missing cart images');
      else {
        await page.waitForFunction(selector => [...document.querySelectorAll(selector + ' .pictrue img')].filter(i => i.naturalWidth > 0).length === 3, selector);
        images = await list.evaluate(metrics);
        assert.equal(images.length, 3);
        assert(images.every(i => i.naturalWidth > 0 && i.width > 40 && i.height > 40));
      }
      console.log((baseline ? 'REPRODUCED ' : 'PASS ') + name, JSON.stringify(images));
    }
    if (!baseline) {
      const controls = await page.locator('.carnum').first().evaluate(el => [...el.querySelectorAll('.quantity-button,.num input')].map(e => ({ tag: e.tagName, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })));
      assert(controls.length === 3 && controls.every(r => r.width >= 30 && r.height >= 30), 'Quantity buttons and input have a consistent touch area');
      await page.locator('.invalidGoods .goodsNav').getByText('失效商品', { exact: true }).click();
      const invalid = page.locator('.invalidGoods .goodsList');
      await invalid.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.invalidGoods .goodsList img')?.naturalWidth > 0);
      await page.screenshot({ path: path.join(out, 'after-invalid-cart.png') });
      assert.equal((await invalid.evaluate(metrics)).length, 1);
      await page.goto(fixture.origin + '/pages/goods_cate/goods_cate');
      await page.locator('.category-buy').first().click();
      await page.locator('.product-window-layer.is-open').waitFor();
      await page.waitForFunction(() => document.querySelector('.product-window-layer.is-open .pictrue img')?.naturalWidth > 0);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(out, 'after-specification.png') });
      results.push({ name: 'specification', images: await page.locator('.product-window-layer.is-open').evaluate(metrics) });
      await page.goto(fixture.origin + '/pages/goods_details/index?id=1');
      await page.waitForFunction(() => {
        const slides = [...document.querySelectorAll('.product-info-diy .slide-image img')];
        return slides.length === 11 && slides.every(img => img.naturalWidth > 0) && new Set(slides.map(i => i.src)).size === 11;
      });
      await page.locator('.product-info-diy .image-wrap').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, 'after-product-gallery.png') });
      results.push({ name: 'gallery', count: 11 });
      await page.goto(fixture.origin + '/pages/goods/order_details/index?order_id=image-audit');
      await page.waitForFunction(() => document.querySelector('.orderGoods .pictrue img')?.naturalWidth > 0);
      await page.locator('.orderGoods').scrollIntoViewIfNeeded();
      assert((await page.locator('.orderGoods').innerText()).includes('123.45'), 'Historical prices stay tied to the order snapshot');
      await page.screenshot({ path: path.join(out, 'after-order-detail.png') });
      results.push({ name: 'order', images: await page.locator('.orderGoods').evaluate(metrics) });
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, baseline ? 'browser-before.json' : 'browser-after.json'), JSON.stringify(results, null, 2));
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(out, 'browser-image-failure.png') });
      console.error(JSON.stringify({ url: page.url(), errors, text: (await page.locator('body').innerText()).slice(0, 1200), requests: (await(await fetch(fixture.origin+'/__requests')).json()).data.requests, state: await page.evaluate(()=>{const pages=getCurrentPages(),p=pages[pages.length-1];return {order_id:p&&p.$vm&&p.$vm.order_id,isLogin:p&&p.$vm&&p.$vm.isLogin};}) }));
    }
    throw error;
  } finally { await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); media.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
