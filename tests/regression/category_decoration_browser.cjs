// Run against a production H5 build. All category/cart responses and writes are isolated fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const h5 = path.resolve(process.env.CRMEB_H5_BUILD || path.join(root, '.build/category-release/h5'));
const evidence = path.join(root, '.build/category-release/screenshots');
const testNavigation = process.env.CRMEB_TEST_NAVIGATION === '1';
const testComponents = process.env.CRMEB_TEST_COMPONENTS === '1';
const { transform } = require('./theme_component_harness.cjs');
function shared(name) { const m = { exports: {} }; new Function('module', 'exports', 'require', transform(fs.readFileSync(path.join(root, 'template/shared', name + '.js'), 'utf8')))(m, m.exports, id => shared(id.replace('./', ''))); return m.exports; }
const { commonStyleDefaults } = shared('componentStyle');
const { navigationComponent } = shared('navigationComponent');
const { headerActions } = shared('pageActions');
const { checkoutComponent } = shared('checkoutComponent');
fs.mkdirSync(evidence, { recursive: true });
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://local');
  if (url.pathname.startsWith('/api/')) {
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    // Existing local dev backend supplies read-only app bootstrap configuration.
    return http.get('http://127.0.0.1:8011' + req.url, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); }).on('error', () => { res.writeHead(502); res.end(); });
  }
  let file = path.resolve(h5, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(h5 + path.sep)) file = path.join(h5, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(h5, 'index.html');
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const status of (process.env.CRMEB_TEST_LAYOUT ? [Number(process.env.CRMEB_TEST_LAYOUT)] : [1, 2, 3])) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      const decoration = { status, page_title: '可配置分类', show_search: 1, search_placeholder: '搜索精选商品', show_recommend: 1,
        recommend_text: '精选', columns: 4, price_color: '#123456', side_active_text_color: '#234567',
        sub_tab_style: 'outline', sub_tab_active_background_color: '#345678', buy_button_style: 8,
        name_lines: 1, text_bold: 1, image_radius: 24 };
      const pic = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#dbeafe"/><rect x="120" y="40" width="360" height="320" fill="#93c5fd"/><text x="220" y="220" font-size="36">原图</text></svg>');
      let navigation = { name: 'pageFoot', isHide: false, effectConfig: { tabVal: 1 }, navConfig: { tabVal: 0 }, navStyleConfig: { tabVal: 0 }, toneConfig: { tabVal: 1 },
        topConfig: { val: 3 }, bottomConfig: { val: 3 }, mbConfig: { val: 0 }, prConfig: { val: 0 },
        bgColor: { color: [{ item: '#123456' }] }, bgColor2: { color: [{ item: '#123456' }] }, txtColor: { color: [{ item: '#ABCDEF' }] }, activeTxtColor: { color: [{ item: '#FFCC33' }] },
        mainNavigation: { title: '主导航栏', backgroundMode: 'custom', corner: 24, visiblePages: ['/pages/index/index', '/pages/goods_cate/goods_cate', '/pages/order_addcart/order_addcart', '/pages/user/index'] },
        menuList: [{ name: '首页', link: '/pages/index/index' }, { name: '分类', link: '/pages/goods_cate/goods_cate' }, { name: '智能', link: '/pages/goods_cate/goods_cate?sid=21' }, { name: '购物车', link: '/pages/order_addcart/order_addcart' }, { name: '我的', link: '/pages/user/index' }].map(item => ({ ...item, imgList: [pic, pic] })),
      };
      if (testComponents) {
        navigation = navigationComponent(navigation);
        navigation.bottomBgColor.color[0].item = '#123456';
        decoration.navigation_mode = 'page';
        decoration.search_style = commonStyleDefaults('#eaf3ff');
        decoration.category_style = commonStyleDefaults();
        decoration.category_style.marginConfig.val = 4;
        decoration.category_style.paddingConfig.val = 8;
        decoration.search_actions = headerActions({left:[{type:'home',label:'返回首页',showLabel:true}],right:[{type:'cart',showLabel:true}]});
        decoration.actions_mode = 'components';
        decoration.checkout = checkoutComponent({buttonText:'立即结算'});
      }
      const homeNavigation = JSON.parse(JSON.stringify(navigation));
      homeNavigation.menuList[0].name = '首页导航';
      await page.route('**/api/**', async route => {
        const u = new URL(route.request().url());
        let data;
        if (testNavigation && u.pathname === '/api/theme/navigation') data = testComponents && u.searchParams.get('page') === 'user' ? [] : testComponents && ['home', 'cart'].includes(u.searchParams.get('page')) ? homeNavigation : navigation;
        else if (u.pathname === '/api/theme_info/category') data = decoration;
        else if (u.pathname === '/api/category') data = [
          { id: 1, cate_name: '家居', pic, children: [{ id: 11, cate_name: '床上用品', pic }, { id: 12, cate_name: '家用电器', pic }] },
          { id: 2, cate_name: '数码', pic, children: [{ id: 21, cate_name: '智能设备', pic }] },
        ];
        else if (u.pathname === '/api/products') {
          requests.push(Object.fromEntries(u.searchParams));
          data = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, store_name: '精选商品完整名称 ' + (i + 1), image: pic, price: '99.00', stock: 10, spec_type: i % 2, cart_button: 1, cart_num: 0, activity: null }));
        } else if (u.pathname === '/api/cart/count') data = { count: testNavigation ? 1 : 0, ids: testNavigation ? [1001] : [] };
        else if (testNavigation && u.pathname === '/api/cart/list') data = { valid: [{ id: 1001, product_id: 4, cart_num: 1, attrStatus: true, status: true, truePrice: '10.00', productInfo: { id: 4, store_name: '主导航结算测试', price: '10.00', stock: 100, image: pic } }], invalid: [] };
        else if (u.pathname === '/api/v2/cart_list') data = [];
        else if (u.pathname === '/api/v2/get_today_coupon') data = { list: [] };
        else if (u.pathname === '/api/v2/new_coupon') data = { show: false, list: [] };
        else if (u.pathname === '/api/user') data = { uid: 1, nickname: '测试用户', orderStatusNum: {} };
        else if (u.pathname === '/api/user/set_visit') data = {};
        else if (route.request().method() !== 'GET') return route.fulfill({ json: { status: 400, msg: 'Browser fixture does not write to the server' } });
        else return route.continue();
        return route.fulfill({ json: { status: 200, data } });
      });
      await page.goto(base + '/pages/index/index', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        getApp().$store.commit('LOGIN', { token: 'category-fixture-token', time: 0 });
        getApp().$store.commit('SETUID', 1);
      });
      if (testComponents && status === 1) {
        await page.locator('.store-navigation .foot-item').filter({ hasText: '首页导航' }).waitFor();
        await page.evaluate(() => getApp().$router.push({ type: 'switchTab', path: '/pages/user/index' }));
        await page.waitForFunction(() => !document.querySelector('.store-navigation .footer-dock'));
        await page.evaluate(() => getApp().$router.push({ type: 'switchTab', path: '/pages/index/index' }));
        await page.locator('.store-navigation .foot-item').filter({ hasText: '首页导航' }).waitFor();
        console.log('PASS page navigation isolation: home settings and removed user navigation');
      }
      if (testNavigation && !testComponents && status === 1) {
        for (const path of ['/pages/order_addcart/order_addcart', '/pages/user/index']) {
          await page.evaluate(path => getApp().$router.push({ type: 'switchTab', path }), path);
          await page.locator('.store-navigation .footer-dock').waitFor();
          await page.waitForFunction(path => document.querySelector('.store-navigation [aria-current="page"]')?.textContent.includes(path.includes('order_addcart') ? '购物车' : '我的'), path);
          assert.equal(await page.locator('.footer-dock').count(), 1);
          if (path.includes('order_addcart')) {
            await page.locator('.shoppingCart .footer').waitFor();
            await page.waitForFunction(() => document.querySelector('.shoppingCart .footer').getBoundingClientRect().bottom <= document.querySelector('.store-navigation .footer-dock').getBoundingClientRect().top + 1);
          }
        }
        console.log('PASS navigation cart/profile: single active menu and checkout clearance');
      }
      await page.evaluate(() => getApp().$router.push({ type: 'switchTab', path: '/pages/goods_cate/goods_cate' }));
      await page.locator('.category-decorated').waitFor().catch(async error => {
        console.error({ status, errors, body: (await page.locator('body').innerText()).slice(0, 1000) });
        throw error;
      });
      await page.waitForFunction(() => getCurrentPages().slice(-1)[0]?.$vm?.category > 0);
      assert.equal(await page.title(), '可配置分类');
      assert.equal(await page.locator('.category-page-title').innerText(),'可配置分类');
      if (testNavigation) {
        const dock = page.locator('.store-navigation .footer-dock');
        await dock.waitFor();
        assert.equal(await page.locator('.footer-dock').count(), 1, 'One global navigation without duplicate page footers');
        assert(Math.abs(parseFloat(await page.locator('.store-navigation .page-footer').evaluate(el => getComputedStyle(el).borderRadius)) - (testComponents ? 24 * 390 / 375 : 24)) < 1);
        assert.equal(await dock.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(18, 52, 86)');
        if (status === 1) {
          navigation.menuList[0].name = '这是八字菜单名称';
          await page.evaluate(() => uni.$emit('uploadFooter'));
          await page.locator('.store-navigation .txt').filter({ hasText: '这是八字菜单名称' }).waitFor();
          await page.setViewportSize({ width: 320, height: 740 });
          assert((await dock.boundingBox()).width <= 320);
          assert.equal(await page.locator('.store-navigation .txt').first().evaluate(el => getComputedStyle(el).textOverflow), 'ellipsis');
          const items = await page.locator('.store-navigation .foot-item').evaluateAll(items => items.map(item => item.getBoundingClientRect().right));
          assert(items.every(right => right <= 321), 'Five menu items fit narrow screens');
          await page.setViewportSize({ width: 390, height: 844 });
          navigation.menuList[0].name = '首页';
          await page.evaluate(() => uni.$emit('uploadFooter'));
        }
        await page.locator('.store-navigation .foot-item').filter({ hasText: '智能' }).click().catch(async error => {
          console.error(await page.evaluate(() => ({ offset: getComputedStyle(document.documentElement).getPropertyValue('--store-nav-offset'), height: getComputedStyle(document.documentElement).getPropertyValue('--store-nav-height'),
            items: ['.store-navigation', '.footer-dock', '.page-footer-wrapper', '.store-navigation .page-footer', '.category-decorated > .footer'].map(selector => { const el = document.querySelector(selector); if (!el) return selector; const style = getComputedStyle(el); return { selector, rect: el.getBoundingClientRect().toJSON(), bottom: style.bottom, position: style.position, transform: style.transform, display: style.display }; }) })));
          throw error;
        });
        await page.waitForFunction(() => getCurrentPages().slice(-1)[0].$vm.selectedCategory.sid === 21);
        await page.waitForFunction(() => document.querySelector('.store-navigation [aria-current="page"]')?.textContent.includes('智能'));
        assert.equal(await page.locator('.store-navigation [aria-current="page"]').count(), 1);
        assert.equal(await page.locator('.store-navigation .txt.active').evaluate(el => getComputedStyle(el).color), 'rgb(255, 204, 51)');
        if (status > 1 || testComponents) {
          await page.locator('.category-checkout-dock').waitFor();
          await page.waitForFunction(() => document.querySelector('.category-checkout-dock').getBoundingClientRect().bottom <= document.querySelector('.store-navigation .footer-dock').getBoundingClientRect().top + 1);
          const checkout = await page.locator('.category-checkout-dock').boundingBox();
          const bounds = await dock.boundingBox();
          assert(checkout.y + checkout.height <= bounds.y + 1, 'Checkout stays above the navigation');
        }
        // Return to the ordinary category before exercising the original style regression.
        await page.locator('.store-navigation .foot-item').filter({ hasText: '分类' }).click();
        await page.waitForFunction(() => getCurrentPages().slice(-1)[0].$vm.selectedCategory.sid === 0);
      }
      if (status === 1) {
        await page.locator('.recommend-section').waitFor();
        assert.equal(await page.locator('.listw .list').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 4);
        await page.locator('.aside .item').filter({ hasText: '数码' }).click();
        await page.waitForFunction(() => getCurrentPages().slice(-1)[0].$vm.$refs.classOne.navActive === 1);
      } else {
        await page.locator('.category-product').first().waitFor();
        assert(await page.locator('.category-products').evaluate((el, kind) => el.classList.contains(kind), status === 2 ? 'large' : 'list'));
        assert.equal(await page.locator('.product-price').first().evaluate(el => getComputedStyle(el).color), 'rgb(18, 52, 86)');
        await page.locator('.aside .item').filter({ hasText: '数码' }).click();
        await page.waitForFunction(() => { const r = getCurrentPages().slice(-1)[0].$vm; return (r.$refs.classTwo || r.$refs.classThree).cid === 2; });
        assert(requests.some(request => request.cid === '2'));
        if(testComponents){
          assert.equal(await page.locator('.category-search-shell .page-action-button').count(),2);
          assert.equal(await page.locator('.checkout-submit').innerText(),'立即结算');
          await page.evaluate(()=>{
            const root=getCurrentPages().slice(-1)[0].$vm.$el;
            const el=[...root.querySelectorAll('.wrapper .uni-scroll-view')].find(el=>el.querySelector('.category-products')&&/auto|scroll/.test(getComputedStyle(el).overflowY));
            if(!el)throw Error('No scrollable product list'); el.setAttribute('data-action-scroll','true');
          });
          const scroll=page.locator('[data-action-scroll]');
          await scroll.evaluate(el=>{el.scrollTop=360;});
          await page.waitForTimeout(250);
          assert.equal(await page.locator('.footer-dock.is-collapsed').count(),0,'always-visible navigation stays shown during scrolling');
          navigation.scrollMode='smart'; await Promise.all([page.waitForResponse(response=>response.url().includes('/theme/navigation')),page.evaluate(()=>uni.$emit('uploadFooter'))]);
          await page.waitForTimeout(200);
          await scroll.evaluate(el=>{el.scrollTop=600;});
          await page.waitForFunction(()=>document.querySelector('.store-navigation .footer-dock').classList.contains('is-collapsed')).catch(async error=>{
            console.error(await page.evaluate(()=>{
              const el=document.querySelector('[data-action-scroll]');
              let component=document.querySelector('.store-navigation').__vue__;
              const chain=[];for(let i=0;component&&i<5;i++,component=component.$parent)chain.push({name:component.$options.name,mode:component.navigation?.scrollMode,collapsed:component.collapsed,enabled:component.enabled,ignore:component._ignoreScrollUntil,now:Date.now()});
              return {top:el.scrollTop,height:el.scrollHeight,client:el.clientHeight,chain, containers:[el,el.parentElement,el.parentElement.parentElement].map(e=>({tag:e.tagName,style:e.getAttribute('style'),height:getComputedStyle(e).height})),vars:getComputedStyle(el).getPropertyValue('--cat-search-height'),scrolls:[...getCurrentPages().slice(-1)[0].$vm.$el.querySelectorAll('.wrapper .uni-scroll-view')].map(e=>({height:e.clientHeight,scroll:e.scrollHeight,overflow:getComputedStyle(e).overflowY}))};
            }));throw error;
          });
          await page.waitForFunction(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--store-nav-offset'))===0);
          await scroll.evaluate(el=>{el.scrollTop=450;});
          await page.waitForFunction(()=>!document.querySelector('.store-navigation .footer-dock').classList.contains('is-collapsed'));
          navigation.scrollMode='always';await page.evaluate(()=>uni.$emit('uploadFooter'));
          await scroll.evaluate(el=>{el.scrollTop=0;});
        }
        await page.waitForFunction(() => { const r = getCurrentPages().slice(-1)[0].$vm; const parent = r.$refs.classTwo || r.$refs.classThree; return (parent.$refs.d_goodClass || parent.$refs.goodClass)?.tempArr?.length >= 2; });
        // Exercise the real parent/list event wiring without calling a cart endpoint.
        const events = await page.evaluate(() => {
          const r = getCurrentPages().slice(-1)[0].$vm;
          const parent = r.$refs.classTwo || r.$refs.classThree;
          const list = parent.$refs.d_goodClass || parent.$refs.goodClass;
          const events = [];
          list.$off('gocartduo'); list.$off('gocartdan');
          list.$on('gocartduo', item => events.push(['spec', item.id]));
          list.$on('gocartdan', item => events.push(['single', item.id]));
          list.buy(list.tempArr[0], 0); list.buy(list.tempArr[1], 1);
          r.categoryDecoration = { ...r.categoryDecoration, product_layout: 'grid', show_search: 0 };
          return events;
        });
        assert.deepEqual(events, [['single', 1], ['spec', 2]]);
        await page.locator('.category-products.grid').waitFor();
        assert.equal(await page.locator('.category-products').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2);
        assert.equal(await page.locator('.category-search-shell').count(), 0);
        assert((await page.locator('.longTab').boundingBox()).y < 44 + (testComponents ? 18 : 5), 'Hidden search must not leave an empty header gap');
        assert((await page.locator('.openList').boundingBox()).y < 44 + (testComponents ? 18 : 5), 'The expand control stays aligned with subcategory tabs');
      }
      if (testComponents) {
        const body = page.locator('.category-module-shell > .conter, .category-module-shell > .scroll-box').first();
        const box = await body.boundingBox();
        assert(box.x >= 3 && box.x + box.width <= 388, 'Configured module margins stay inside the viewport');
        assert(Math.abs(parseFloat(await body.evaluate(el => getComputedStyle(el).paddingTop)) - 8 * 390 / 375) < 1);
        const out = path.join(root, '.build/theme-components/screenshots'); fs.mkdirSync(out, { recursive: true });
        await page.screenshot({ path: path.join(out, 'h5-category-' + status + '.png') });
      }
      await page.screenshot({ path: path.join(evidence, 'h5-style-' + status + '.png'), fullPage: true });
      if (testNavigation) {
        const dir = path.join(root, '.build/navigation-release/screenshots'); fs.mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: path.join(dir, 'navigation-category-' + status + '.png') });
        navigation.mainNavigation.visiblePages = ['/pages/index/index'];
        if (testComponents) navigation.isHide = true;
        await page.evaluate(() => uni.$emit('uploadFooter'));
        await page.waitForFunction(() => !document.querySelector('.store-navigation .footer-dock') && !document.body.classList.contains('has-store-navigation'));
        navigation.mainNavigation.visiblePages.push('/pages/goods_cate/goods_cate');
        if (testComponents) { navigation.isHide = false; navigation.bottomBgColor.color[0].item = '#FFFFFF'; }
        navigation.navStyleConfig.tabVal = 1;
        navigation.mainNavigation.backgroundMode = 'system';
        await page.evaluate(() => uni.$emit('uploadFooter'));
        await page.locator('.store-navigation .footer-dock').waitFor();
        assert.equal(await page.locator('.store-navigation uni-image').count(), 0, 'Text-only menu hides icons');
        assert.equal(await page.locator('.store-navigation .footer-dock').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('.store-navigation .footer-dock').waitFor();
        navigation.effectConfig.tabVal = 0;
        await page.evaluate(() => uni.$emit('uploadFooter'));
        await page.waitForFunction(() => !document.querySelector('.store-navigation .footer-dock'));
        navigation.effectConfig.tabVal = 1; delete navigation.mainNavigation;
        await page.evaluate(() => uni.$emit('uploadFooter'));
        await page.waitForFunction(() => !document.body.classList.contains('has-store-navigation'));
        assert.equal(await page.locator('.store-navigation .footer-dock').count(), 0, 'Legacy category navigation visibility stays unchanged');
        console.log(`PASS navigation style ${status}: appearance, query links, single selection, checkout clearance, visibility, disable and direct entry`);
      }
      assert.deepEqual(errors, [], 'H5 page errors');
      console.log(`PASS browser style ${status}: production rendering, custom appearance and category interaction`);
      await context.close();
    }
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
