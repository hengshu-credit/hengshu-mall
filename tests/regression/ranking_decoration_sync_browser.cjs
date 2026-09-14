const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.build/ranking-review');
const fixture='http://127.0.0.1:18013';
const servers=[];
async function serve(folder,prefix=''){
 const server=http.createServer((req,res)=>{
  if(/^\/(adminapi|api|statics)\//.test(req.url)){const upstream=http.request(fixture+req.url,{method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});req.pipe(upstream);return;}
  let file=path.resolve(folder,'.'+new URL(req.url,'http://local').pathname.replace(prefix,''));if(!file.startsWith(folder+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(folder,'index.html');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });servers.push(server);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+server.address().port;
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const [adminBase,mobileBase]=await Promise.all([serve(path.join(out,'admin'),/^\/admin/),serve(path.join(out,'h5'))]);
  const context=await browser.newContext({viewport:{width:1600,height:1000}});
  await context.addCookies([{name:'from-crmeb-admin:token',value:'fixture-only',url:adminBase}]);
  await context.addInitScript(()=>localStorage.setItem('vuex',JSON.stringify({userInfo:{uniqueAuth:['fixture-theme'],userInfo:{id:1}}})));
  await context.routeWebSocket('**/*',()=>{});
  await context.route('http://10.0.2.2:18013/**',async route=>route.fulfill({response:await route.fetch({url:route.request().url().replace('http://10.0.2.2:18013',fixture)})}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>document.querySelector('.diy-page')?.__vue__.loading===false);
  const save=async()=>{const rev=(await(await fetch(fixture+'/__fixtures')).json()).data.revision;await page.getByRole('button',{name:'保存',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.diy-page').__vue__.loading);assert.equal((await(await fetch(fixture+'/__fixtures')).json()).data.revision,rev+1);};
  await page.goto(adminBase+'/admin/setting/edit_theme?id=52&type=detail&page_type=merchant');await ready();
  const rank=page.locator('.ranking-preview .rank-info');await rank.waitFor();
  for(let attempt=0;attempt<3;attempt++){
   await rank.click();assert(await rank.evaluate(el=>el.closest('.mConfig-item').classList.contains('on')),'rank must be selectable after deselection');
   await page.locator('.scroll-box .mConfig-item').first().click();
  }
  await rank.click();assert.equal(await page.getByText('示例预览，仅用于装修',{exact:true}).count(),0);
  await page.locator('.right-box').getByText('样式设置',{exact:true}).click();
  await page.locator('.right-box [data-field="fontSize"] input').fill('17');await page.locator('.right-box [data-field="fontSize"] input').press('Tab');
  await save();await page.screenshot({path:path.join(out,'detail-ranking-selected.png')});
  // Apply edits through the canvas inspector, then publish only to the local fixture store.
  for(const [id,node,prefix] of [[50,'商品成交量','同步成交 '],[51,'在售商品数','同步在售 ']]){
   await page.goto(adminBase+`/admin/setting/edit_theme?id=${id}&type=home&page_type=micro`);await ready();
   await page.locator('.scroll-box .ranking-canvas [data-node-id="'+node+'"]').first().click();
   await page.getByRole('button',{name:'配置展示内容与样式',exact:true}).click();
   await page.locator('.rc-editor-preview [data-node-id="'+node+'"]').first().click();
   await page.locator('[data-content-field="affixes"] input').first().fill(prefix);
   await page.locator('.rc-inspector [data-field="fontSize"] input').fill('14');await page.locator('.rc-inspector [data-field="fontSize"] input').press('Tab');
   await page.getByRole('button',{name:'整行背景与边框',exact:true}).click();await page.locator('.rc-inspector [data-field="borderWidth"] input').fill('2');await page.locator('.rc-inspector [data-field="borderWidth"] input').press('Tab');
   await page.getByRole('button',{name:'返回装修',exact:true}).click();await page.locator('.v-modal').waitFor({state:'hidden'});await save();
  }
  await page.goto(adminBase+'/admin/setting/edit_theme?id=52&type=home&page_type=merchant');await ready();
  await page.locator('.merchant-preview .shop-heading').first().click();
  await page.locator('.merchant-settings .el-form-item').filter({hasText:'搜索提示'}).locator('input').fill('同步搜索店内好物');
  await page.locator('.merchant-settings .el-form-item').filter({hasText:'关注前文字'}).locator('input').fill('关注好店');await save();
  const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});mobile.on('pageerror',e=>errors.push(e.message));
  const paths=[['product-ranking','/pages/annex/special/index?theme_id=50','[data-node-id="商品成交量"]','同步成交'],['shop-ranking','/pages/annex/special/index?theme_id=51','[data-node-id="在售商品数"]','同步在售'],['shop-home','/pages/merchant/shop?id=1','.shop-name','数码生活旗舰店'],['product-detail','/pages/goods_details/index?id=4','.rp-detail-name','商品热销榜']];
  for(const [name,url,selector,expected] of paths){
   await mobile.goto(mobileBase+url);await mobile.locator(selector).first().waitFor({timeout:20000});assert((await mobile.locator(selector).first().innerText()).includes(expected));
   if(name==='product-detail')assert(Math.abs(await mobile.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))-17*390/375)<1);
   if(name==='shop-home')assert((await mobile.locator('.shop-search').first().innerText()).includes('同步搜索店内好物'));
   await mobile.screenshot({path:path.join(out,'sync-h5-'+name+'.png'),fullPage:true});
  }
  for(const layout of [1,2,3]){
   await fetch(fixture+'/__category?layout='+layout);await mobile.goto(mobileBase+'/pages/merchant/category?id=1');
   await mobile.waitForFunction(layout=>getCurrentPages().at(-1)?.$vm.decoration?.status===layout,layout);
   await mobile.getByText('平板电脑',{exact:true}).first().waitFor({timeout:15000});
   assert.equal(await mobile.locator('.shop-category-header .page-title-text').textContent(),'店铺商品分类');
   await mobile.screenshot({path:path.join(out,'sync-h5-shop-category-'+layout+'.png'),fullPage:true});
  }
  await fetch(fixture+'/__category?layout=1');
  assert.deepEqual(errors,[]);
  console.log('PASS: repeated rank selection, no preview note, saved product/shop canvas content and borders, detail typography, merchant home settings and all 3 merchant category layouts in production H5');
 }finally{await browser.close();servers.forEach(s=>{s.closeAllConnections();s.close();});}
})().catch(e=>{console.error(e);process.exitCode=1;});
