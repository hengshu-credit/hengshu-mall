const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { defaults } = require('./app_decoration_fixture.cjs');
const root = path.resolve(__dirname, '../..'), out = path.join(root, '.build/home-title');
const servers = [];
function serve(folder, prefix = /^$/) {
  const server = http.createServer((req, res) => {
    let file = path.resolve(folder, '.' + new URL(req.url, 'http://fixture').pathname.replace(prefix, ''));
    if (!file.startsWith(folder + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(folder, 'index.html');
    res.setHeader('Content-Type', ({ '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.woff':'font/woff', '.ttf':'font/ttf' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  servers.push(server);
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port)));
}
async function main() {
  fs.mkdirSync(out, {recursive:true});
  const [adminBase, mobileBase] = await Promise.all([
    serve(path.resolve(process.env.CRMEB_HOME_TITLE_ADMIN || path.join(out, 'admin')), /^\/admin/),
    serve(path.resolve(process.env.CRMEB_HOME_TITLE_H5 || path.join(root, '.build/release-6.0.13/packaged-h5'))),
  ]);
  const comb = defaults('home_comb.vue'); comb.timestamp = 1;
  comb.classConfig.tabVal = 1;
  let saved = {type:'home',title:'首页',is_show:1,navigation_mode:'page',value:{1:comb}}, saves = 0;
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1600,height:1000}});
    await context.addCookies([{name:'from-crmeb-admin:token',value:'fixture-only',url:adminBase}]);
    await context.addInitScript(() => localStorage.setItem('vuex', JSON.stringify({userInfo:{uniqueAuth:['fixture-theme'],userInfo:{id:1}}})));
    await context.routeWebSocket('**/*', () => {});
    const page = await context.newPage(), errors = [], variants = {};
    page.on('pageerror', e => errors.push(e.message)); page.setDefaultTimeout(15000);
    await page.route('**/adminapi/**', route => {
      const pathname = new URL(route.request().url()).pathname; let data = {};
      if (route.request().resourceType() === 'script' || pathname.endsWith('/custom_admin_js')) return route.fulfill({contentType:'application/javascript',body:''});
      if (/\/theme\/info\/\d+\/home$/.test(pathname)) data = saved;
      else if (/\/theme\/info\/\d+\/base$/.test(pathname)) data = {id:42,title:'首页标题核验'};
      else if (/\/theme\/info\/\d+\/theme$/.test(pathname)) data = {theme_color:'#155eef'};
      else if (/\/theme\/save\//.test(pathname)) {const body=route.request().postDataJSON(); assert.equal(body.type,'home'); saved=body.value; saves++; data={id:42};}
      else if (/category_list/.test(pathname)) data = [];
      return route.fulfill({json:{status:200,msg:'成功',data}});
    });
    const ready = () => page.waitForFunction(() => document.querySelector('.diy-page')?.__vue__.loading === false);
    const save = async name => {
      const before = saves;
      await page.getByRole('button',{name:'保存',exact:true}).click(); await ready();
      assert.equal(saves,before+1); variants[name]=JSON.parse(JSON.stringify(saved));
      await page.reload(); await ready();
      assert.equal(await page.locator('.overflowy > .page-title').count(),0,'no fallback title after reload');
    };
    await page.goto(adminBase+'/admin/setting/edit_theme?id=42&type=home'); await ready();
    assert.equal(await page.locator('.overflowy > .page-title').count(),0,'home has no fixed heading');
    assert.equal(await page.locator('.page-title-preview').count(),0,'no implicit title component');
    await page.getByRole('button',{name:'页面设置',exact:true}).click();
    const name = page.locator('.right-box .c_row-item').filter({hasText:'页面名称'}).locator('input');
    await name.fill('首页管理名称'); await name.press('Tab');
    await save('absent'); assert.equal(saved.title,'首页管理名称');
    assert.equal(await page.locator('.page-title-preview').count(),0,'metadata name does not create a displayed title');
    await page.screenshot({path:path.join(out,'editor-without-title.png')});
    const catalog = page.locator('.diy-wrapper .left .list-group-item').filter({hasText:'页面标题'});
    await catalog.click(); await page.locator('.right-box .title-content input').first().fill('首页精选好物');
    await save('added'); assert.equal(await page.locator('.page-title-preview .page-title-text').textContent(),'首页精选好物');
    await page.locator('.mConfig-item').filter({has:page.locator('.page-title-preview')}).click();
    await page.getByRole('button',{name:'隐藏页面标题',exact:true}).click(); await save('hidden');
    assert.equal(await page.locator('.mConfig-item.hide').filter({has:page.locator('.page-title-preview')}).count(),1);
    await page.locator('.mConfig-item').filter({has:page.locator('.page-title-preview')}).click();
    await page.getByRole('button',{name:'显示页面标题',exact:true}).click();
    await page.getByRole('button',{name:'删除页面标题',exact:true}).click();
    await page.locator('.el-message-box').getByRole('button',{name:'确定',exact:true}).click();
    await save('deleted'); assert.equal(await page.locator('.page-title-preview').count(),0);
    assert.equal(Object.values(saved.value).filter(item=>item.name==='pageTitleBar').length,0);
    await catalog.click(); await page.locator('.right-box .title-content input').first().fill('重新添加的首页标题');
    await save('restored'); await page.screenshot({path:path.join(out,'editor-added-title.png')});
    fs.writeFileSync(path.join(out,'saved-pages.json'),JSON.stringify(variants,null,2));
    const mobile = await browser.newPage({viewport:{width:390,height:844}}); mobile.on('pageerror',e=>errors.push(e.message));
    let mobileConfig;
    await mobile.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname; let data = {};
      if (route.request().resourceType()==='script' || pathname==='/api/get_script') return route.fulfill({contentType:'application/javascript',body:''});
      if (pathname==='/api/theme_info/home') data=mobileConfig;
      else if (pathname==='/api/theme_info/theme') data={theme_color:'#155eef'};
      else if (['/api/theme/navigation','/api/category','/api/products'].includes(pathname)) data=[];
      else if (pathname==='/api/v2/get_today_coupon') data={list:[]};
      else if (pathname==='/api/v2/new_coupon') data={show:false,list:[]};
      else if (pathname==='/api/cart/count') data={count:0,ids:[]};
      return route.fulfill({json:{status:200,data}});
    });
    for (const [key,count,title] of [['absent',0],['added',1,'首页精选好物'],['hidden',0],['deleted',0],['restored',1,'重新添加的首页标题']]) {
      mobileConfig=variants[key]; await mobile.goto(mobileBase+'/pages/index/index');
      await mobile.waitForFunction(()=>getCurrentPages().at(-1)?.$vm.currentDiyData.title==='首页管理名称');
      assert.equal(await mobile.locator('.page-title-bar').count(),count,key);
      assert.equal(await mobile.locator('uni-page-head:visible').count(),0,'no replacement native header');
      if (title) assert.equal(await mobile.locator('.page-title-bar .page-title-text').textContent(),title);
      if (['absent','restored'].includes(key)) await mobile.screenshot({path:path.join(out,'h5-'+key+'.png')});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: home has no reserved heading; real title add/edit/hide/delete/re-add survives save/reopen and matches mobile H5 in all five states');
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>servers.forEach(s=>{s.closeAllConnections();s.close();}));
