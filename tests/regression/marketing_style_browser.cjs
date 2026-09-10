const fs = require('node:fs'),
  path = require('node:path'),
  http = require('node:http'),
  assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { root, transform, compiler } = require('./theme_component_harness.cjs');
const h5 = path.join(root, '.build/commerce-ui/h5');
const now = Math.floor(Date.now() / 1000);
const style = {
  border: {
    id: 1,
    name: '测试边框',
    mobile_image: '/__marketing/border.svg',
    start_time: now - 3600,
    end_time: now + 3600,
  },
  atmosphere: {
    id: 2,
    name: '测试氛围',
    mobile_image: '/__marketing/mobile.svg',
    pc_image: '/__marketing/pc.svg',
    start_time: now - 3600,
    end_time: now + 3600,
  },
};
const m = { exports: {} };
new Function(
  'module',
  'exports',
  'require',
  transform(
    compiler.parseComponent(
      fs.readFileSync(path.join(root, 'template/admin/src/components/mobilePage/home_product_info.vue'), 'utf8'),
    ).script.content,
  ),
)(m, m.exports, (id) => (id === 'vuex' ? { mapState: () => ({}) } : {}));
const config = m.exports.default.data.call({ num: 1 }).defaultConfig;
const theme = { actions_mode: 'components', navigation_mode: 'page', value: { 0: config } };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://local');
  if (u.pathname.startsWith('/__marketing/')) {
    res.setHeader('Content-Type', 'image/svg+xml');
    const pc = u.pathname.includes('/pc'),
      border = u.pathname.includes('/border');
    return res.end(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${pc ? 810 : 750}" height="${
        border ? 750 : pc ? 50 : 152
      }"><rect width="100%" height="100%" fill="${
        border ? 'none' : pc ? 'purple' : 'red'
      }" stroke="red" stroke-width="28"/></svg>`,
    );
  }
  if (u.pathname.startsWith('/api/'))
    return http.get('http://127.0.0.1:8011' + req.url, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
  let file = path.resolve(h5, '.' + u.pathname);
  if (!file.startsWith(h5 + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
    file = path.join(h5, 'index.html');
  res.setHeader(
    'Content-Type',
    { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' }[
      path.extname(file)
    ] || 'application/octet-stream',
  );
  fs.createReadStream(file).pipe(res);
});
(async () => {
  const product = await (await fetch('http://127.0.0.1:8011/api/product/detail/4')).json();
  assert.equal(product.status, 200);
  product.data.storeInfo.marketing_style = style;
  product.data.activity = [];
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } }),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/api/**', async (route) => {
      const u = new URL(route.request().url());
      let data;
      if (u.pathname === '/api/theme_info/detail') data = theme;
      else if (u.pathname === '/api/theme/navigation') data = [];
      else if (u.pathname === '/api/products') data = [product.data.storeInfo];
      else if (u.pathname === '/api/product/detail/4') data = product.data;
      else if (u.pathname.startsWith('/api/product/real_price/'))
        data = { real_price: 3999, member_price: 3999, ot_price: 4799 };
      else if (u.pathname === '/api/cart/count') data = { count: 0, ids: [] };
      else if (route.request().method() !== 'GET') data = {};
      else return route.continue();
      return route.fulfill({ json: { status: 200, msg: '成功', data } });
    });
    await page.goto(base + '/pages/goods/goods_list/index?searchValue=Apple');
    await page.locator('.marketing-style.border').waitFor();
    const bounds = await page.locator('.marketing-style.border').evaluate((el) => {
      const a = el.getBoundingClientRect(),
        b = el.parentElement.getBoundingClientRect();
      return { w: a.width, h: a.height, pw: b.width, ph: b.height, pointer: getComputedStyle(el).pointerEvents };
    });
    assert(bounds.w > 0 && Math.abs(bounds.w - bounds.pw) < 1 && Math.abs(bounds.h - bounds.ph) < 1);
    assert.equal(bounds.pointer, 'none');
    assert.equal(
      await page.locator('.productList .pictrue > uni-image img').first().getAttribute('src'),
      product.data.storeInfo.image,
    );
    await page.locator('.productList .list > .item').first().click();
    await page.waitForURL('**/pages/goods_details/index?id=4');
    await page.locator('.marketing-style.atmosphere').waitFor();
    await page.waitForFunction(
      () => document.querySelector('.marketing-style.atmosphere').getBoundingClientRect().height > 70,
    );
    const geometry = await page.locator('.product-info-box').evaluate((el) => {
      const a = el.querySelector('.marketing-style.atmosphere').getBoundingClientRect(),
        hero = el.querySelector('.image-wrap').getBoundingClientRect(),
        info = el.querySelector('.info-box');
      return {
        width: a.width,
        height: a.height,
        heroEnd: hero.bottom,
        start: a.top,
        end: a.bottom,
        infoTop: info.getBoundingClientRect().top,
        margin: getComputedStyle(info).marginTop,
      };
    });
    assert(Math.abs(geometry.height / geometry.width - 152 / 750) < 0.01);
    assert.equal(geometry.margin, '0px');
    assert(Math.abs(geometry.heroEnd - geometry.start) < 1);
    assert(geometry.infoTop >= geometry.end - 1);
    await page.evaluate(() => {
      const find = (vm) => (vm.$options.name === 'productInfo' ? vm : vm.$children.map(find).find(Boolean));
      const walk = (vm) =>
        vm.$el && vm.$el.classList && vm.$el.classList.contains('product-info-diy')
          ? vm
          : vm.$children.map(walk).find(Boolean);
      window.infoComponent = walk(getCurrentPages().at(-1).$vm);
      window.originalMarketing = JSON.parse(JSON.stringify(infoComponent.productData.marketing_style));
      infoComponent.productData.marketing_style.atmosphere.end_time = Math.floor(Date.now() / 1000) + 1;
    });
    await page.locator('.marketing-style.atmosphere').waitFor({ state: 'detached', timeout: 5000 });
    assert.notEqual(
      await page.locator('.info-box').evaluate((el) => getComputedStyle(el).marginTop),
      '0px',
      'expired atmosphere releases the normal information margin',
    );
    await page.evaluate(() => {
      infoComponent.productData.marketing_style = originalMarketing;
    });
    await page.locator('.marketing-style.atmosphere').waitFor();
    await page.locator('.marketing-style.atmosphere uni-image').evaluate((el) => el.dispatchEvent(new Event('error')));
    await page.locator('.marketing-style.atmosphere').waitFor({ state: 'detached' });
    assert.notEqual(
      await page.locator('.info-box').evaluate((el) => getComputedStyle(el).marginTop),
      '0px',
      'failed atmosphere leaves no blank strip',
    );
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.reload();
    await page.locator('.marketing-style.atmosphere img[src$="/pc.svg"]').waitFor();
    await page.waitForFunction(() => {
      const r = document.querySelector('.marketing-style.atmosphere').getBoundingClientRect();
      return r.height > 0 && Math.abs(r.height / r.width - 50 / 810) < 0.01;
    });
    assert.deepEqual(errors, []);
    console.log(
      'PASS marketing styles: product image unchanged, border bounds/click-through, mobile/PC atmosphere ratio, no overlap, expiry and image-error cleanup',
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.closeAllConnections();
  server.close();
  process.exitCode = 1;
});
