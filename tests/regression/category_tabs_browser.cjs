const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {root,transform}=require('./theme_component_harness.cjs');
const h5=path.join(root,'.build/commerce-ui/h5');
function shared(name){const m={exports:{}};new Function('module','exports','require',transform(fs.readFileSync(path.join(root,'template/shared',name+'.js'),'utf8')))(m,m.exports,id=>shared(id.replace('./','')));return m.exports;}
const names=['智能手机','影音周边','穿戴设备','手机配件','平板电脑','折叠手机','名称较长的分类'];
const categories=[{id:1,cate_name:'手机数码',children:names.map((cate_name,i)=>({id:i+11,cate_name}))},{id:2,cate_name:'电脑办公',children:[]}];
let layout=2;
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://local');
  if(u.pathname.startsWith('/api/'))return http.get('http://127.0.0.1:8011'+req.url,r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  let file=path.resolve(h5,'.'+u.pathname);if(!file.startsWith(h5+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(h5,'index.html');
  res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:375,height:812}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>addEventListener('unhandledrejection',event=>console.error('CATEGORY_UI_REJECTION',JSON.stringify(event.reason))));
    page.on('console',message=>{if(message.text().startsWith('CATEGORY_UI_REJECTION'))console.error(message.text());});
    await page.route('**/api/**',async route=>{
      const u=new URL(route.request().url());let data;
      if(u.pathname==='/api/theme_info/category')data=shared('categoryPageConfig').normalizeCategoryPage({status:layout});
      else if(u.pathname==='/api/theme/navigation')data=shared('navigationComponent').navigationComponent();
      else if(u.pathname==='/api/category')data=categories;
      else if(u.pathname==='/api/products'||u.pathname==='/api/v2/cart_list')data=[];
      else if(u.pathname==='/api/cart/count')data={count:0,ids:[]};
      else if(u.pathname==='/api/user')data={uid:1,nickname:'分类界面验证',orderStatusNum:{}};
      else if(route.request().method()!=='GET')data={};
      else return route.continue();
      return route.fulfill({json:{status:200,msg:'成功',data}});
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/pages/index/index');
    await page.waitForFunction(()=>typeof getApp==='function' && getApp().$store);
    await page.evaluate(()=>{getApp().$store.commit('LOGIN',{token:'category-ui-fixture',time:0});getApp().$store.commit('SETUID',1);});
    for(layout of [2,3]) {
      await page.goto('http://127.0.0.1:'+server.address().port+'/pages/goods_cate/goods_cate');
      await page.waitForFunction(()=>document.querySelectorAll('.longItem').length===8);
      const rects=await page.locator('.longItem').evaluateAll(nodes=>nodes.map(el=>({width:el.getBoundingClientRect().width,y:el.getBoundingClientRect().y,height:el.getBoundingClientRect().height,whiteSpace:getComputedStyle(el).whiteSpace})));
      assert(rects.every(item=>Math.abs(item.width-rects[0].width)<1&&item.height===28&&item.y===rects[0].y&&item.whiteSpace==='nowrap'),'native source layout '+layout+' keeps equal-width single-line tabs');
      assert.notEqual(await page.locator('.aside').evaluate(el=>getComputedStyle(el).boxShadow),'none');
      const sidebar=await page.locator('.aside').boundingBox(),body=await page.locator('.category-module-shell > .conter').boundingBox();
      assert(Math.abs(sidebar.height-body.height)<1,'sidebar shadow spans the category height');
      const before=await page.locator('.longTab').boundingBox();
      await page.getByRole('button',{name:'展开二级分类',exact:true}).click();
      await page.locator('.downTab').waitFor();
      assert.equal(await page.locator('.downTab .children .item').count(),8);
      const grid=await page.locator('.downTab').boundingBox(),content=await page.locator('.category-module-shell .wrapper').boundingBox();
      assert(Math.abs(grid.width-content.width)<1,'expanded grid uses the full content width');
      assert.equal((await page.locator('.longTab').boundingBox()).height,before.height,'opening the grid preserves the strip height');
      await page.locator('.downTab .item').filter({hasText:names.at(-1)}).click();
      await page.locator('.downTab').waitFor({state:'detached'});
      assert.equal(await page.locator('.longItem.click').innerText(),names.at(-1));
      await page.getByRole('button',{name:'展开二级分类',exact:true}).click();
      await page.getByRole('button',{name:'收起二级分类',exact:true}).click();
      await page.locator('.downTab').waitFor({state:'detached'});
    }
    assert.deepEqual(errors,[]);console.log('PASS category layouts 2/3: equal-width single row, full-height shadow, expand/select/collapse and preserved strip geometry');
  } finally {await browser.close();server.closeAllConnections();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
