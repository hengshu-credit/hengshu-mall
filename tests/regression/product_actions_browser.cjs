// Exercise the production detail page; product/cart/collection responses are isolated fixtures.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {root,transform,compiler}=require('./theme_component_harness.cjs');
const h5=path.resolve(process.env.CRMEB_H5_BUILD||path.join(root,'.build/page-actions/h5'));
function shared(name){const m={exports:{}};new Function('module','exports','require',transform(fs.readFileSync(path.join(root,'template/shared',name+'.js'),'utf8')))(m,m.exports,id=>shared(id.replace('./','')));return m.exports;}
function defaults(name){const m={exports:{}};new Function('module','exports','require',transform(compiler.parseComponent(fs.readFileSync(path.join(root,'template/admin/src/components/mobilePage',name+'.vue'),'utf8')).script.content))(m,m.exports,id=>id==='vuex'?{mapState:()=>({})}:id.includes('shared/')?shared(id.split('/').pop()):{});return m.exports.default.data.call({num:1}).defaultConfig;}
const header=defaults('search_box');header.headerActions=shared('pageActions').headerActions({left:[{type:'home',showLabel:true}],right:[{type:'collect',showLabel:true},{type:'share',showLabel:true}]});
const bar=defaults('home_bottom_menu');
const info=defaults('home_product_info');
const navigation=shared('navigationComponent').navigationComponent({scrollMode:'always'});
const theme={actions_mode:'components',navigation_mode:'page',value:{header,info,bar}};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://local');
  if(url.pathname==='/fixture-product.png'){res.setHeader('Content-Type','image/png');fs.createReadStream(path.join(root,'template/admin/src/assets/images/product-diy.png')).pipe(res);return;}
  if(url.pathname.startsWith('/api/'))return http.get('http://127.0.0.1:8011'+req.url,r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);}).on('error',()=>{res.writeHead(502);res.end();});
  let file=path.resolve(h5,'.'+url.pathname);if(!file.startsWith(h5+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(h5,'index.html');
  res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],writes=[],cartWrites=[];
    let failCart=true,cartCount=0;
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    await page.route('**/api/**',async route=>{
      const u=new URL(route.request().url());let data;
      if(u.pathname==='/api/theme_info/detail')data=theme;
      else if(u.pathname==='/api/theme_info/theme')data={theme_color:'#E93323',gradient_color:'#FF7B30',sub_color:'#FAAD14',light_color:'#FFF5F0'};
      else if(u.pathname==='/api/theme/navigation')data=theme.value.nav?navigation:[];
      else if(u.pathname==='/api/product/detail/22')data={storeInfo:{id:22,store_name:'测试商品 · 电热水壶',price:99,vip_price:90,ot_price:110,stock:10,cart_button:1,min_qty:1,presale:0,userCollect:false,image:base+'/fixture-product.png',slider_image:[base+'/fixture-product.png'],description:'',is_gift:0},productAttr:[],productValue:{},coupons:[],good_list:[],replyCount:0,replyChance:0,spec_unique:'test',routine_contact_type:0};
      else if(u.pathname.startsWith('/api/product/real_price/'))data={real_price:99,member_price:90,ot_price:110};
      else if(u.pathname==='/api/collect/add'||u.pathname==='/api/collect/del'){writes.push({path:u.pathname,body:route.request().postDataJSON()});data={};}
      else if(u.pathname==='/api/cart/add'){
        cartWrites.push(route.request().postDataJSON());
        if(failCart)return route.fulfill({json:{status:400,msg:'模拟加购失败'}});
        cartCount++;data={cartId:101};
      }
      else if(u.pathname==='/api/cart/count')data={count:cartCount,ids:cartCount?[101]:[]};
      else if(u.pathname==='/api/user')data={uid:1,nickname:'验证用户',orderStatusNum:{}};
      else if(/image_base64|set_visit/.test(u.pathname))data={};
      else if(route.request().method()!=='GET')return route.fulfill({json:{status:400,msg:'Fixture does not write to server'}});
      else return route.continue();
      return route.fulfill({json:{status:200,msg:'成功',data}});
    });
    await page.goto(base+'/pages/goods_details/index?id=22',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>getCurrentPages().at(-1).$vm.detailStatus==='ready');
    const footer=page.locator('.footer.commerce-actions');
    await footer.waitFor();
    assert.match(await footer.innerText(),/首页\s*收藏\s*购物车\s*加入购物车\s*立即购买/);
    const cart=footer.locator('uni-button.joinCart'),buy=footer.locator('uni-button.buy');
    const cartRect=await cart.boundingBox(),buyRect=await buy.boundingBox();
    assert(cartRect.width>90&&buyRect.width>90,'Both purchase buttons retain usable widths');
    assert(Math.abs(cartRect.y-buyRect.y)<1,'Purchase buttons stay on one row');
    assert(buyRect.x-(cartRect.x+cartRect.width)>=8,'Original separate capsule buttons retain their gap');
    assert(await cart.evaluate(e=>parseFloat(getComputedStyle(e).borderRadius)>=18),'Cart button retains capsule corners');
    assert(await buy.evaluate(e=>parseFloat(getComputedStyle(e).borderRadius)>=18),'Buy button retains capsule corners');
    assert(await footer.evaluate(e=>getComputedStyle(e.firstElementChild).backgroundImage.includes('255, 255, 255')),'Default toolbar background remains white');
    fs.mkdirSync(path.join(root,'.build/page-actions/screenshots'),{recursive:true});
    await page.screenshot({path:path.join(root,'.build/page-actions/screenshots/h5-detail-default.png')});
    await footer.screenshot({path:path.join(root,'.build/page-actions/screenshots/h5-detail-default-bar.png')});
    await page.evaluate(()=>{getApp().$store.commit('LOGIN',{token:'product-action-fixture',time:0});getApp().$store.commit('SETUID',1);});
    await cart.click();
    const confirm=page.locator('#product-window .product-window.on .joinBnt.bg-color');
    await confirm.waitFor();
    await page.waitForFunction(()=>document.querySelector('#product-window .product-window.on').getBoundingClientRect().bottom<=innerHeight+1);
    await page.screenshot({path:path.join(root,'.build/page-actions/screenshots/h5-detail-sku-confirmation.png')});
    assert.equal(cartWrites.length,0,'Opening SKU selection does not write a cart');
    await confirm.click();
    await page.waitForFunction(()=>getCurrentPages().at(-1).$vm.cartSubmitting===false);
    assert.equal(cartWrites.length,1);assert.equal(cartWrites[0].new,0);
    await confirm.waitFor();
    failCart=false;
    await confirm.click();
    await page.waitForFunction(()=>getCurrentPages().at(-1).$vm.CartCount===1);
    assert.equal(cartWrites.length,2,'Failed add can be retried from the selected SKU');
    assert.equal(await page.locator('#product-window .product-window.on').count(),0);
    // Custom and hidden states are separate from the default appearance evidence.
    bar.showContent.type=[3,1,2,4];bar.cartButton.tabVal=1;bar.buyButton.tabVal=1;
    Object.assign(bar,shared('componentStyle').commonStyleDefaults('#f0f6ff'));bar.paddingConfig.val=12;
    await page.evaluate(()=>getCurrentPages().at(-1).$vm.getDiyData());
    await page.waitForFunction(()=>!document.querySelector('.footer uni-button.buy'));
    await page.evaluate(()=>{getApp().$store.commit('LOGIN',{token:'product-action-fixture',time:0});getApp().$store.commit('SETUID',1);});
    await page.locator('.page-action-button[aria-label="收藏"]').click();
    await page.waitForFunction(()=>getCurrentPages().at(-1).$vm.storeInfo.userCollect);
    assert.equal(writes[0].body.id,22);
    assert.equal(await page.locator('.page-action-button .icon-shoucang1').count(),1);
    await page.locator('.page-action-button[aria-label="分享"]').click();
    await page.waitForFunction(()=>getCurrentPages().at(-1).$vm.posters);
    await page.evaluate(()=>getCurrentPages().at(-1).$vm.listenerActionClose());
    assert.doesNotMatch(await footer.innerText(),/立即购买|加入购物车/);
    await page.waitForFunction(()=>getCurrentPages().at(-1).$vm.productActionHeight>60);
    await page.waitForFunction(()=>Math.abs(document.querySelector('.footer.commerce-actions').getBoundingClientRect().height-getCurrentPages().at(-1).$vm.productActionHeight)<2);
    assert.equal(await page.locator('.store-navigation .footer-dock').count(),0,'detail defaults to product operations only');
    assert(Math.abs((await footer.boundingBox()).y+(await footer.boundingBox()).height-844)<2,'product operations sit at the screen bottom');
    fs.mkdirSync(path.join(root,'.build/page-actions/screenshots'),{recursive:true});
    await page.screenshot({path:path.join(root,'.build/page-actions/screenshots/h5-detail-custom-hidden-actions.png')});
    theme.value.nav=navigation;await page.evaluate(async()=>{await getCurrentPages().at(-1).$vm.getDiyData();uni.$emit('uploadFooter');});
    await page.locator('.store-navigation .footer-dock').waitFor();
    await page.waitForFunction(()=>document.querySelector('.footer.commerce-actions').getBoundingClientRect().bottom<=document.querySelector('.store-navigation .footer-dock').getBoundingClientRect().top+1);
    delete theme.value.nav;await page.evaluate(async()=>{await getCurrentPages().at(-1).$vm.getDiyData();uni.$emit('uploadFooter');});
    await page.waitForFunction(()=>!document.querySelector('.store-navigation .footer-dock'));
    bar.isHide=true;await page.evaluate(()=>getCurrentPages().at(-1).$vm.getDiyData());
    await page.waitForFunction(()=>!document.querySelector('.footer.commerce-actions')&&getCurrentPages().at(-1).$vm.productActionHeight===0);
    delete theme.value.bar;await page.reload({waitUntil:'networkidle'});
    assert.equal(await footer.count(),0,'deleted product bar remains absent on reload');
    assert.deepEqual(errors,[]);console.log('PASS production product actions: SKU confirmation, add failure/retry, header collection/share, styles, navigation stacking/removal and action hide/delete');
  }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
