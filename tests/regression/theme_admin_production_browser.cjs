const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), dist = path.join(root, 'template/admin/dist');
async function assertSelectionPaint(page, selector, name) {
  const frame=page.locator(selector), outline=frame.locator(':scope > .module-selection');
  const color=await outline.evaluate(el=>getComputedStyle(el).borderTopColor);
  assert.equal(await outline.evaluate(el=>getComputedStyle(el).pointerEvents),'none','selection overlay must not block component interaction');
  const output=path.join(root,'.build','selection-'+name+'.png');
  await frame.screenshot({path:output});
  const sample=require('node:child_process').spawnSync('python',['-c','from PIL import Image; import sys,json; im=Image.open(sys.argv[1]).convert("RGB"); w,h=im.size; print(json.dumps([im.getpixel(p) for p in [(w//2,1),(w//2,h-2),(1,h//2),(w-2,h//2)]]))',output],{encoding:'utf8'});
  assert.equal(sample.status,0,sample.stderr);
  const expected=color.match(/\d+/g).slice(0,3).map(Number);
  assert(JSON.parse(sample.stdout).every(pixel=>pixel.every((v,i)=>Math.abs(v-expected[i])<=2)),name+' selected border must paint above the component on all four sides');
}
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.ttf': 'font/ttf', '.html': 'text/html' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if(pathname.startsWith('/statics/')) {
    const asset=path.resolve(root,'crmeb/public','.'+pathname);
    if(asset.startsWith(path.join(root,'crmeb/public/statics')+path.sep)&&fs.existsSync(asset)&&fs.statSync(asset).isFile()) {res.setHeader('Content-Type',mime[path.extname(asset)]||'application/octet-stream');fs.createReadStream(asset).pipe(res);return;}
  }
  let file = path.resolve(dist, '.' + pathname.replace(/^\/admin/, ''));
  if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(dist, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addCookies([{ name: 'from-crmeb-admin:token', value: 'fixture-only', url: base }]);
    await context.addInitScript(() => localStorage.setItem('vuex', JSON.stringify({ userInfo: { uniqueAuth: ['fixture-theme'], userInfo: { id: 1 } } })));
    // Notification sockets are outside this editor fixture; keep them local and idle.
    await context.routeWebSocket('**/*',()=>{});
    const page = await context.newPage(), errors = [], writes = [], theme = { base: { title: '组件验证主题', id: 42 }, home: { value: {} }, detail: { value: {} }, user: { value: {} }, category: {status:1,layout_configs:[]}, theme: { theme_color: '#155EEF' } };
    page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); }); page.setDefaultTimeout(15000);
    await page.route('**/adminapi/**', async route => {
      const u = new URL(route.request().url()); let data = {};
      if (route.request().resourceType() === 'script' || u.pathname.endsWith('/custom_admin_js')) { return route.fulfill({ contentType: 'application/javascript', body: '' }); }
      const match = u.pathname.match(/\/theme\/info\/\d+\/(\w+)/);
      if (match) data = theme[match[1]] || {};
      else if (/\/theme\/save\//.test(u.pathname)) { const body = route.request().postDataJSON(); writes.push(body); theme[body.type] = body.value; data = { id: 42 }; }
      else if (/category_list/.test(u.pathname)) data = [];
      else if (/diy\/get_page_category$/.test(u.pathname)) data = [{id:1,name:'商城页面',children:[{id:2,pid:1,name:'基础页面',children:[{id:3,pid:2,name:'常用页面',type:'link',children:[]}]}]}];
      else if (/diy\/link\/list\/3$/.test(u.pathname)) data = {count:2,list:[{id:1,name:'商品搜索',url:'/pages/goods/goods_search/index'},{id:2,name:'个人中心',url:'/pages/user/index'}]};
      return route.fulfill({ json: { status: 200, msg: '成功', data } });
    });
    if(process.env.CRMEB_TEST_PALETTE==='1') {
      await page.goto(base+'/admin/setting/edit_theme?id=42&type=theme');
      await page.waitForFunction(()=>document.querySelector('.style-config-container')?.__vue__.ready);
      assert.equal(await page.locator('.palette-swatch').count(),12);
      assert.equal(await page.locator('.palette-page').count(),4);
      await page.getByRole('button',{name:'清新蓝',exact:true}).click();
      assert.equal(await page.locator('.palette-page[data-page=home] strong').first().evaluate(e=>getComputedStyle(e).color),'rgb(51, 136, 255)');
      for(const layout of ['1','2','3']){await page.getByRole('combobox',{name:'分类预览布局'}).selectOption(layout);await page.waitForFunction(()=>Array.from(document.querySelectorAll('.category-mini img')).every(img=>img.complete && img.naturalWidth>0));}
      const inputs=page.locator('.config-item .color-picker-row > .el-input input');
      await inputs.nth(0).fill('#804DFF');await inputs.nth(1).fill('#AC8EFF');await inputs.nth(2).fill('#37206D');
      await page.getByRole('button',{name:'保存配色',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('.style-config-container').__vue__.dirty);
      assert.equal(writes.at(-1).value.palette_mode,'custom');assert.equal(writes.at(-1).value.light_color,'rgba(128, 77, 255, 0.1)');
      await page.reload();await page.waitForFunction(()=>document.querySelector('.style-config-container')?.__vue__.ready);
      assert.equal(await inputs.nth(0).inputValue(),'#804DFF');
      const before=writes.length;await inputs.nth(0).fill('#bad!');await page.getByRole('button',{name:'保存配色',exact:true}).click();assert.equal(writes.length,before,'invalid colors do not save');
      await inputs.nth(0).fill('#804DFF');await page.getByRole('button',{name:'保存配色',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.style-config-container').__vue__.dirty);
      await page.evaluate(()=>document.querySelector('.style-config-container').__vue__.$message.closeAll());
      fs.mkdirSync(path.join(root,'.build/theme-palettes/screenshots'),{recursive:true});await page.screenshot({path:path.join(root,'.build/theme-palettes/screenshots/palettes.png'),fullPage:true});
    }
    await page.goto(base + '/admin/setting/edit_theme?id=42&type=home');
    if(process.env.CRMEB_TEST_PALETTE==='1') await page.waitForFunction(()=>document.querySelector('.edit-theme-layout').__vue__.$refs.homeEditor.$refs.diy.colorStyle.theme==='#804DFF');
    assert.equal(await page.locator('.left .list-group-item').filter({hasText:'商品操作栏'}).count(),0,'home must not offer product operations');
    await page.locator('.diy-wrapper .left .list-group-item').filter({ hasText: '导航栏' }).click();
    await page.locator('.navigation-label input').fill('首页专用');
    await page.getByRole('tab', { name: '样式设置', exact: true }).click();
    await page.locator('.navigation-settings .margin-style-config').filter({ hasText: '外边距' }).locator('input').first().fill('10');
    await page.locator('.navigation-settings .margin-style-config').filter({ hasText: '外边距' }).locator('input').first().press('Enter');
    await Promise.all([page.waitForResponse(r => r.url().includes('/theme/save/')), page.getByRole('button', { name: '保存', exact: true }).click()]);
    await page.waitForFunction(() => !document.querySelector('.edit-theme-layout').__vue__.isDirty);
    await page.waitForFunction(() => document.querySelector('.navigation-preview-menu') !== null);
    assert.equal(writes.at(-1).type, 'home');
    assert.equal(Object.values(writes.at(-1).value.value)[0].mainNavigation.title, '首页专用');
    await page.locator('.sidebar-container .menu-item').filter({ hasText: '个人中心' }).click();
    await page.waitForURL('**type=user');
    if(process.env.CRMEB_TEST_PALETTE==='1') await page.waitForFunction(()=>document.querySelector('.edit-theme-layout').__vue__.$refs.userEditor.$refs.diy.colorStyle.theme==='#804DFF');
    assert.equal(await page.locator('.navigation-preview-menu').count(), 0, 'home navigation does not appear in user editor');
    await page.locator('.diy-wrapper .left .list-group-item').filter({ hasText: '导航栏' }).click();
    await page.locator('.navigation-label input').fill('我的导航');
    await page.getByRole('tab',{name:'样式设置',exact:true}).click();
    const userCorners=page.locator('.navigation-settings .margin-style-config').filter({hasText:'背景圆角'});
    await userCorners.locator('.expand-icon').click();
    await userCorners.locator('.main-setting input').fill('30');await userCorners.locator('.main-setting input').press('Enter');
    assert.equal(await page.locator('.navigation-preview-menu').evaluate(el=>getComputedStyle(el).borderRadius),'30px');
    assert.equal(await page.locator('.dock-component').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','dock must not paint over rounded corners');
    assert.match(await page.locator('.navigation-preview-menu button').nth(3).locator('img').getAttribute('src'),/4-002/,'personal center previews the active profile icon');
    await Promise.all([page.waitForResponse(r => r.url().includes('/theme/save/')), page.getByRole('button', { name: '保存', exact: true }).click()]);
    await page.waitForFunction(() => !document.querySelector('.edit-theme-layout').__vue__.isDirty);
    await page.locator('.sidebar-container .menu-item').filter({hasText:'商品详情'}).click();
    await page.waitForURL('**type=detail');
    if(process.env.CRMEB_TEST_PALETTE==='1') await page.waitForFunction(()=>document.querySelector('.edit-theme-layout').__vue__.$refs.detailEditor.$refs.diy.colorStyle.theme==='#804DFF');
    const productCatalog = page.locator('.left .list-group-item').filter({hasText:'商品操作栏'});
    await productCatalog.waitFor();
    await page.locator('.editor-bottom-dock .bottom-menu').click();
    const defaultBar=page.locator('.editor-bottom-dock .bottom-menu');
    assert.match(await defaultBar.innerText(),/首页\s*收藏\s*购物车\s*加入购物车\s*立即购买/);
    const defaultCart=await defaultBar.locator('.cart-btn').boundingBox(),defaultBuy=await defaultBar.locator('.buy-btn').boundingBox();
    assert.equal(defaultCart.height,36);assert.equal(defaultBuy.height,36);
    assert(Math.abs(defaultBuy.x-defaultCart.x-defaultCart.width-10)<1,'Default editor retains separate capsules');
    fs.mkdirSync(path.join(root,'.build/page-actions/screenshots'),{recursive:true});
    if(process.env.CRMEB_TEST_SCREENSHOTS === '1') await defaultBar.screenshot({path:path.join(root,'.build/page-actions/screenshots/admin-detail-default-bar.png')});
    await page.locator('.mobile-config').getByText('分享',{exact:true}).click();
    await page.locator('.mobile-config .c_row-item').filter({hasText:'购买按钮'}).getByText('隐藏',{exact:true}).click();
    assert.equal(await page.locator('.diy-wrapper .left .list-group-item').filter({hasText:'导航栏'}).count(),1,'detail navigation remains an optional component');
    assert.equal(await page.locator('.editor-bottom-dock .dock-component').count(),1);
    await page.locator('.diy-wrapper .left .list-group-item').filter({hasText:'导航栏'}).click();
    assert.equal(await page.locator('.editor-bottom-dock .dock-component').count(),2);
    const productRect=await page.locator('.editor-bottom-dock .bottom-menu').boundingBox();
    const navRect=await page.locator('.editor-bottom-dock .navigation-preview-menu').boundingBox();
    assert(productRect.y+productRect.height<=navRect.y+1,'optional navigation and product actions do not overlap');
    await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存',exact:true}).click()]);
    await page.waitForFunction(()=>!document.querySelector('.edit-theme-layout').__vue__.isDirty);
    let product=Object.values(writes.at(-1).value.value).find(item=>item.name==='bottomMenu');
    assert(product.showContent.type.includes(4));assert.equal(product.buyButton.tabVal,1);
    await page.reload();await page.locator('.editor-bottom-dock .bottom-menu').waitFor();
    assert.equal(await page.locator('.editor-bottom-dock .buy-btn').count(),0);
    await page.locator('.editor-bottom-dock .bottom-menu').click();
    fs.mkdirSync(path.join(root,'.build/page-actions/screenshots'),{recursive:true});
    if(process.env.CRMEB_TEST_SCREENSHOTS === '1') await page.screenshot({path:path.join(root,'.build/page-actions/screenshots/admin-detail-actions.png')});
    await page.locator('.editor-bottom-dock .dock-component').filter({has:page.locator('.bottom-menu')}).locator('.iconshanchu3').click();
    await page.getByRole('button',{name:'确定',exact:true}).click();
    await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存',exact:true}).click()]);
    await page.waitForFunction(()=>!document.querySelector('.edit-theme-layout').__vue__.isDirty);
    await page.reload();await productCatalog.waitFor();
    assert.equal(await page.locator('.editor-bottom-dock .bottom-menu').count(),0,'deleted product actions stay deleted');
    await productCatalog.click();await page.locator('.editor-bottom-dock .bottom-menu').waitFor();
    await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存',exact:true}).click()]);
    await page.waitForFunction(()=>!document.querySelector('.edit-theme-layout').__vue__.isDirty);
    for (const [label, type] of [['商城首页','home'],['个人中心','user'],['商品详情','detail']]) {
      await page.locator('.sidebar-container .menu-item').filter({hasText:label}).click();
      await page.waitForURL('**type='+type);
      await page.locator('.diy-wrapper .left .list-group-item').filter({hasText:'页面标题'}).click();
      await page.locator('.title-content .el-form-item').filter({hasText:'标题文字'}).locator('input').fill(label+'标题');
      await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存',exact:true}).click()]);
      await page.waitForFunction(()=>!document.querySelector('.edit-theme-layout').__vue__.isDirty);
      const title=Object.values(writes.at(-1).value.value).find(item=>item.name==='pageTitleBar');
      assert.equal(title.title,label+'标题');
      await page.reload();
      await page.locator('.page-title-preview').filter({hasText:label+'标题'}).waitFor();
    }
    await page.locator('.sidebar-container .menu-item').filter({ hasText: '商品分类' }).click();
    await page.waitForURL('**type=category');
    await page.setViewportSize({width:1280,height:900});
    await page.locator('.category-editor .el-loading-mask').waitFor({state:'hidden'});
    for(const button of await page.locator('.page-editor-actions > button').all()){const box=await button.boundingBox();assert.ok(box.x>=0 && box.x+box.width<=1280,'category page tools fit actual production sidebar layout');}
    assert.equal(await page.locator('.page-editor-actions > button').count(),4);
    {
      const layout=await page.evaluate(()=>{
        const preview=document.querySelector('.category-canvas-page, .cart-preview'),actions=document.querySelector('.page-editor-actions');
        return {preview:preview.getBoundingClientRect().toJSON(),buttons:[...actions.querySelectorAll(':scope > button')].map(el=>el.getBoundingClientRect().toJSON()),insidePreview:preview.contains(actions),insideSettings:!!actions.closest('.settings-panel,.cart-settings')};
      });
      assert.equal(layout.insidePreview,false,'page actions are excluded from the phone cover');
      assert.equal(layout.insideSettings,false,'page actions sit next to the canvas instead of in settings');
      assert(layout.buttons.every(rect=>rect.x>=layout.preview.right+47&&rect.x===layout.buttons[0].x&&rect.width===94&&rect.height===32),'page actions match the home editor vertical rail');
      for(let i=1;i<layout.buttons.length;i++)assert(layout.buttons[i].top-layout.buttons[i-1].bottom>=19,'page action buttons have separate rows');
    }

    await page.getByRole('button',{name:'搜索框',exact:true}).click();
    await page.locator('.mobile-config .c_row-item').filter({hasText:'提示文字'}).locator('input').fill('统一搜索商品');
    assert.equal(await page.locator('.category-canvas-scroll .search-box').count(),1,'category uses the original search preview');
    await assertSelectionPaint(page,'.category-canvas-scroll > .editor-module-frame.selected','search');
    await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存分类页',exact:true}).click()]);
    await page.waitForFunction(()=>!document.querySelector('.edit-theme-layout').__vue__.isDirty);
    assert.equal(theme.category.search_component.name,'headerSerch');
    assert.equal(theme.category.search_component.tipConfig.value,'统一搜索商品');
    await page.locator('.module-grid button').nth(2).click();
    await page.locator('.module-grid button').nth(4).click();
    await page.getByRole('tab', { name: '样式设置', exact: true }).click();
    await page.waitForFunction(() => { const tab = document.querySelector('.navigation-settings .el-tabs__nav'); const bar = tab.querySelector('.el-tabs__active-bar'); return bar.getBoundingClientRect().left > tab.getBoundingClientRect().left + tab.getBoundingClientRect().width / 2; });
    const directory = path.join(root, '.build/theme-components/screenshots'); fs.mkdirSync(directory, { recursive: true });
    if(process.env.CRMEB_TEST_SCREENSHOTS === '1') await page.screenshot({ path: path.join(directory, 'admin-production-category.png') });
    const panel = await page.locator('.settings-panel').boundingBox();
    const inputs = await page.locator('.navigation-settings input').evaluateAll(nodes => nodes.filter(el => el.offsetWidth).map(el => el.getBoundingClientRect().right));
    assert(inputs.every(right => right <= panel.x + panel.width + 1), 'configuration inputs fit their panel');
    await page.locator('.module-grid button').nth(5).click();
    await page.getByRole('tab',{name:'内容设置',exact:true}).click();
    await page.getByText('悬浮胶囊',{exact:true}).click();
    await page.getByText('选中后',{exact:true}).click();
    assert.equal(await page.locator('.checkout-preview-surface').evaluate(el=>getComputedStyle(el).borderRadius),'24px');
    await page.waitForTimeout(300); // Let Element UI's radio/switch color transitions finish for evidence.
    const shots=path.join(root,'.build/theme-consistency/screenshots');fs.mkdirSync(shots,{recursive:true});
    if(process.env.CRMEB_TEST_SCREENSHOTS === '1') await page.screenshot({path:path.join(shots,'admin-floating-checkout.png')});
    await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存分类页',exact:true}).click()]);
    await page.waitForFunction(()=>!document.querySelector('.edit-theme-layout').__vue__.isDirty);
    await page.locator('.canvas-page-title').click();
    await page.locator('.category-canvas-scroll .search-box').hover();
    assert.equal(await page.locator('.editor-module-frame .module-tools:visible').count(),1,'hover must not add an adjacent toolbar to the selected component');
    const titleTools=await page.locator('.canvas-title-module .module-tools').boundingBox();
    const searchFrame=await page.locator('.category-canvas-scroll > .editor-module-frame').first().boundingBox();
    assert(titleTools.y+titleTools.height<=searchFrame.y-4,'editor toolbars keep separation without adding storefront whitespace');

    await page.locator('.el-form-item').filter({hasText:'标题文字'}).locator('input').fill('精选分类');
    assert.equal(await page.locator('.canvas-page-title .page-title-text').innerText(),'精选分类');
    await page.getByRole('button',{name:'删除页面标题',exact:true}).click();
    await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存分类页',exact:true}).click()]);
    await page.reload();await page.locator('.category-editor').waitFor();
    await page.waitForFunction(()=>!document.querySelector('.category-editor').__vue__.loading);
    assert.equal(await page.locator('.canvas-page-title').count(),0);
    await page.locator('.module-grid button').filter({hasText:'页面标题'}).click();
    assert.equal(await page.locator('.canvas-page-title .page-title-text').innerText(),'精选分类');
    await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存分类页',exact:true}).click()]);
    await page.waitForFunction(()=>!document.querySelector('.edit-theme-layout').__vue__.isDirty);
    // With a short catalog, the category surface fills the available area up to checkout.
    await page.evaluate(()=>{const vm=document.querySelector('.preview-body').__vue__;vm.catalog=[{id:1,cate_name:'分类一',children:[]}];vm.products=[];});
    await page.waitForFunction(()=>{const a=document.querySelector('.category-body-module').getBoundingClientRect(),b=document.querySelector('.category-checkout-module').getBoundingClientRect();return Math.abs(a.bottom-b.top)<1;});
    await page.locator('.category-body-module .module-name').click();
    const sidebarFill=await page.evaluate(()=>{
      const frame=document.querySelector('.category-body-surface').getBoundingClientRect(),side=document.querySelector('.side-nav').getBoundingClientRect();
      const hit=document.elementFromPoint(side.left+10,side.bottom-4);
      return {gap:frame.bottom-side.bottom,insideMenu:!!hit.closest('.side-nav'),background:getComputedStyle(document.querySelector('.side-nav')).backgroundColor};
    });
    assert(Math.abs(sidebarFill.gap)<1&&sidebarFill.insideMenu,'short category menus must fill the remaining canvas height');
    assert.notEqual(sidebarFill.background,'rgba(0, 0, 0, 0)');
    await assertSelectionPaint(page,'.category-body-module','category');

    await page.evaluate(()=>{const vm=document.querySelector('.preview-body').__vue__;vm.catalog=[{id:1,cate_name:'手机数码',children:['智能手机','影音周边','穿戴设备','手机配件','平板电脑','折叠手机','名称较长的分类'].map((cate_name,i)=>({id:i+11,cate_name}))}];});
    await page.waitForFunction(()=>document.querySelectorAll('.sub-tabs button').length===8);
    const tabs=await page.locator('.sub-tabs button').evaluateAll(nodes=>nodes.map(el=>({width:el.getBoundingClientRect().width,y:el.getBoundingClientRect().y,whiteSpace:getComputedStyle(el).whiteSpace})));
    assert(tabs.every(tab=>tab.width===75&&tab.y===tabs[0].y&&tab.whiteSpace==='nowrap'),'all secondary tabs have equal widths on a single row');
    assert(await page.locator('.sub-tabs').evaluate(el=>el.scrollWidth>el.clientWidth),'secondary tabs can scroll horizontally');
    assert.notEqual(await page.locator('.side-nav').evaluate(el=>getComputedStyle(el).boxShadow),'none');
    await page.getByRole('button',{name:'展开二级分类',exact:true}).click();
    assert.equal(await page.locator('.sub-tabs-more button').count(),8);
    await page.locator('.sub-tabs-more').getByRole('button',{name:'名称较长的分类',exact:true}).click();
    assert.equal(await page.locator('.sub-tabs-more').count(),0);
    assert.equal(await page.locator('.sub-tabs .selected').innerText(),'名称较长的分类');
    assert(await page.locator('.sub-tabs').evaluate(el=>el.scrollLeft>0),'selection in the expanded grid is scrolled into view');

    await page.locator('.module-grid button').filter({hasText:'分类组件3'}).click();
    await page.waitForTimeout(300);
    if(process.env.CRMEB_TEST_SCREENSHOTS === '1') await page.screenshot({path:path.join(shots,'admin-category-components.png')});
    await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存分类页',exact:true}).click()]);
    await page.waitForFunction(()=>!document.querySelector('.edit-theme-layout').__vue__.isDirty);
    await page.locator('.sidebar-container .menu-item').filter({hasText:'购物车'}).click();
    assert.equal(Array.isArray(theme.category.layout_configs),false,'switching from PHP empty layout arrays saves a layout dictionary');
    await page.waitForURL('**type=cart');
    await page.locator('.cart-editor .el-loading-mask').waitFor({state:'hidden'});
    for(const button of await page.locator('.page-editor-actions > button').all()){const box=await button.boundingBox();assert.ok(box.x>=0 && box.x+box.width<=1280,'cart page tools fit actual production sidebar layout');}
    assert.equal(await page.locator('.page-editor-actions > button').count(),4);
    {
      const layout=await page.evaluate(()=>{
        const preview=document.querySelector('.category-canvas-page, .cart-preview'),actions=document.querySelector('.page-editor-actions');
        return {preview:preview.getBoundingClientRect().toJSON(),buttons:[...actions.querySelectorAll(':scope > button')].map(el=>el.getBoundingClientRect().toJSON()),insidePreview:preview.contains(actions),insideSettings:!!actions.closest('.settings-panel,.cart-settings')};
      });
      assert.equal(layout.insidePreview,false,'page actions are excluded from the phone cover');
      assert.equal(layout.insideSettings,false,'page actions sit next to the canvas instead of in settings');
      assert(layout.buttons.every(rect=>rect.x>=layout.preview.right+47&&rect.x===layout.buttons[0].x&&rect.width===94&&rect.height===32),'page actions match the home editor vertical rail');
      for(let i=1;i<layout.buttons.length;i++)assert(layout.buttons[i].top-layout.buttons[i-1].bottom>=19,'page action buttons have separate rows');
    }

    await page.locator('.cart-library button').filter({hasText:'页面标题'}).click();
    await page.locator('.title-content .el-form-item').filter({hasText:'标题文字'}).locator('input').fill('我的购物袋');
    await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存购物车页',exact:true}).click()]);
    assert.equal(writes.at(-1).type,'cart');
    await page.reload();await page.locator('.cart-title').filter({hasText:'我的购物袋'}).waitFor();
    await page.locator('.cart-library button').filter({hasText:'页面标题'}).click();
    assert.equal(await page.locator('.cart-list-heading .cart-list-manage').innerText(),'管理');
    await page.locator('.cart-service').hover();
    assert.equal(await page.locator('.editor-module-frame .module-tools:visible').count(),1,'cart follows the existing selected-component toolbar behavior');

    await page.locator('.header-actions-settings').getByRole('button',{name:'添加按钮',exact:true}).first().click();
    const linkCard=page.locator('.header-actions-settings .button-card').first();
    await linkCard.locator('.el-select').click();
    await page.locator('.el-select-dropdown:visible').getByText('页面跳转',{exact:true}).click();
    await linkCard.getByPlaceholder('请选择商城页面').click();
    const picker=page.getByRole('dialog',{name:'选择链接',exact:true});
    await picker.getByText('商品搜索',{exact:true}).click();
    await picker.getByRole('button',{name:'确 定',exact:true}).click();
    assert.equal(await linkCard.getByPlaceholder('请选择商城页面').inputValue(),'/pages/goods/goods_search/index');
    await Promise.all([page.waitForResponse(r=>r.url().includes('/theme/save/')),page.getByRole('button',{name:'保存购物车页',exact:true}).click()]);
    assert.equal(theme.cart.title_actions.left[0].link,'/pages/goods/goods_search/index','real page picker selection survives the saved configuration');
    assert.equal(await page.locator('.cart-title .title-left-actions .icon-sousuo').count(),1,'title preview resolves the selected page icon');
    assert.equal(await page.locator('.cart-title .icon-lianjie').count(),0,'title preview must not render the connector glyph');
    if(process.env.CRMEB_TEST_SCREENSHOTS === '1') await page.screenshot({path:path.join(shots,'admin-cart-page.png')});
    assert.deepEqual(errors, []);
    console.log('PASS production admin: real component catalog, navigation controls, page save/switch isolation, category modules and panel layout');
  } catch (error) { console.error(error); throw error; }
  finally { await browser.close(); server.closeAllConnections(); await new Promise(r => server.close(r)); }
})().catch(() => { process.exitCode = 1; });
