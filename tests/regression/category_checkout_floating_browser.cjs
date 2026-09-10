// Exercise the production category page with a populated cart and isolated API fixtures.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {root,transform}=require('./theme_component_harness.cjs');
const h5=path.resolve(process.env.CRMEB_H5_BUILD||path.join(root,'.build/theme-consistency/h5'));
function shared(name){const m={exports:{}};new Function('module','exports','require',transform(fs.readFileSync(path.join(root,'template/shared',name+'.js'),'utf8')))(m,m.exports,id=>shared(id.replace('./','')));return m.exports;}
const {checkoutComponent,checkoutPreset}=shared('checkoutComponent');
const decoration={...shared('categoryPageConfig').categoryLayoutPreset(Number(process.env.CRMEB_TEST_LAYOUT)||3),navigation_mode:'page',checkout:checkoutComponent(checkoutPreset('floating'))};
const navigation=shared('navigationComponent').navigationComponent();
let populated=true;
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname.startsWith('/api/')){if(req.method!=='GET'){res.writeHead(405);return res.end();}return http.get('http://127.0.0.1:8011'+req.url,r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);}).on('error',()=>{res.writeHead(502);res.end();});}
  if(pathname==='/fixture-product.png'){res.setHeader('Content-Type','image/png');return fs.createReadStream(path.join(root,'template/admin/src/assets/images/product-diy.png')).pipe(res);}
  let file=path.resolve(h5,'.'+pathname);if(!file.startsWith(h5+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(h5,'index.html');
  res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:375,height:812}}),errors=[],cartWrites=[];
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
    const pic=base+'/fixture-product.png';
    const items=[{id:101,product_id:22,cart_num:2,attrStatus:true,status:true,truePrice:499.5,productInfo:{id:22,store_name:'已选商品',image:pic,stock:20,price:499.5}}];
    await page.route('**/api/**',async route=>{
      const u=new URL(route.request().url());let data;
      if(u.pathname==='/api/theme_info/category')data=decoration;
      else if(u.pathname==='/api/theme/navigation')data=navigation;
      else if(u.pathname==='/api/category')data=[{id:1,cate_name:'生活家居',pic,children:[{id:11,cate_name:'收纳',pic},{id:12,cate_name:'香薰',pic}]},{id:2,cate_name:'运动专区',pic,children:[]}];
      else if(u.pathname==='/api/products')data=Array.from({length:12},(_,i)=>({id:i+1,store_name:'品质生活精选商品 '+(i+1),image:pic,price:'99.00',stock:20,spec_type:i===0?0:1,cart_button:1,is_virtual:'0',cart_num:0,activity:null}));
      else if(u.pathname.startsWith('/api/v2/get_attr/')){
        const id=Number(u.pathname.split('/')[4]);
        data={storeInfo:{id,stock:20,min_qty:1,price:99,image:pic,cart_button:1},productAttr:[{attr_name:'规格',attr_value:[{attr:'默认'}],attr_values:['默认']}],productValue:{默认:{stock:20,unique:'fixture-'+id,price:99,image:pic}}};
      }
      else if(u.pathname==='/api/v2/set_cart_num'){
        const body=route.request().postDataJSON();cartWrites.push(body);
        items.push({id:101+cartWrites.length,product_id:body.product_id,cart_num:body.num,attrStatus:true,status:true,truePrice:99,productInfo:{id:body.product_id,store_name:'品质生活精选商品 '+body.product_id,image:pic,stock:20,price:99}});
        data={};
      }
      else if(u.pathname==='/api/cart/count')data={count:populated?items.reduce((total,item)=>total+Number(item.cart_num),0):0,ids:populated?items.map(item=>item.id):[]};
      else if(u.pathname==='/api/v2/cart_list')data=populated?items:[];
      else if(u.pathname==='/api/user/set_visit')data={};
      else if(u.pathname==='/api/user')data={uid:1,nickname:'测试用户',orderStatusNum:{}};
      else if(route.request().method()!=='GET')return route.fulfill({json:{status:400,msg:'No fixture writes'}});
      else return route.continue();
      return route.fulfill({json:{status:200,msg:'成功',data}});
    });
    await page.goto(base+'/pages/index/index',{waitUntil:'networkidle'});
    await page.evaluate(()=>{getApp().$store.commit('LOGIN',{token:'fixture-floating',time:0});getApp().$store.commit('SETUID',1);getApp().$router.push({type:'switchTab',path:'/pages/goods_cate/goods_cate'});});
    await page.locator('.floating-checkout').waitFor();
    await page.waitForFunction(()=>document.querySelector('.checkout-amount')?.textContent.includes('999.00'));
    assert.equal(await page.locator('.checkout-submit').innerText(),'去结算(2)');
    assert.match(await page.locator('.checkout-cart uni-image img').getAttribute('src'),/3-002/);
    assert.equal(await page.locator('.checkout-cart uni-image').evaluate(el=>getComputedStyle(el).filter),'brightness(0) invert(1)');
    const surface=page.locator('.category-checkout-content').locator('..');
    assert.equal(await surface.evaluate(el=>getComputedStyle(el).borderRadius),'24px');
    assert.equal(await surface.evaluate(el=>getComputedStyle(el).marginLeft),'10px');
    assert.match(await surface.evaluate(el=>getComputedStyle(el).backgroundImage),/48, 48, 48/);
    assert.equal((await surface.boundingBox()).height,38);
    await page.waitForFunction(()=>document.querySelector('.category-checkout-dock').getBoundingClientRect().bottom<=document.querySelector('.store-navigation .footer-dock').getBoundingClientRect().top+1);
    assert(await page.locator('.store-navigation .foot-item').evaluateAll(items=>items.every(item=>{const r=item.getBoundingClientRect();return item.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})), 'category sidebar must not cover any navigation item');
    const out=path.join(root,'.build/theme-consistency/screenshots');fs.mkdirSync(out,{recursive:true});
    await page.screenshot({path:path.join(out,'h5-floating-checkout.png')});
    await page.locator('.checkout-amount').click();
    await page.locator('.cartList.on').waitFor();
    assert.match(await page.locator('.cartList.on').innerText(),/已选商品/);
    await page.locator('.cartList.on').locator('..').locator('.mask').click({position:{x:10,y:80}});
    await page.waitForFunction(()=>!document.querySelector('.cartList.on'));
    for(const index of [0,1]) {
      await page.locator('.category-product .category-buy').nth(index).click();
      const confirm=page.locator('#product-window .product-window.on .joinBnt.bg-color');
      await confirm.waitFor();
      await page.waitForFunction(()=>document.querySelector('#product-window .product-window.on').getBoundingClientRect().bottom<=innerHeight+1);
      await page.screenshot({path:path.join(out,'h5-category-sku-confirmation-'+index+'.png')});
      assert.equal(cartWrites.length,index,'Opening single or multiple SKU selection does not add immediately');
      await confirm.click();
      await page.waitForFunction(count=>document.querySelector('.checkout-submit')?.textContent.includes('('+count+')'),index+3);
      assert.equal(cartWrites.length,index+1);assert.equal(cartWrites[index].unique,'fixture-'+(index+1));assert.equal(cartWrites[index].num,1);
    }
    await page.locator('.checkout-amount').click();
    await page.locator('.cartList.on').waitFor();
    assert.match(await page.locator('.cartList.on').innerText(),/品质生活精选商品 1/);
    await page.locator('.cartList.on').locator('..').locator('.mask').click({position:{x:10,y:80}});
    await page.waitForFunction(()=>!document.querySelector('.cartList.on'));
    // Return to a cached tab after decoration changed on the server.
    decoration.checkout.cartDisplay='text';decoration.checkout.cartText='购物袋';decoration.checkout.fillet.val=12;
    await page.evaluate(()=>getApp().$router.push({type:'switchTab',path:'/pages/index/index'}));await page.waitForURL('**/pages/index/index');
    await page.evaluate(()=>getApp().$router.push({type:'switchTab',path:'/pages/goods_cate/goods_cate'}));
    await page.waitForFunction(()=>document.querySelector('.checkout-cart')?.textContent.includes('购物袋'));
    assert.equal(await page.locator('.checkout-cart uni-image').count(),0);
    assert.equal(await surface.evaluate(el=>getComputedStyle(el).borderRadius),'12px');
    populated=false;
    await page.evaluate(()=>getApp().$router.push({type:'switchTab',path:'/pages/index/index'}));await page.waitForURL('**/pages/index/index');
    await page.evaluate(()=>getApp().$router.push({type:'switchTab',path:'/pages/goods_cate/goods_cate'}));
    await page.waitForFunction(()=>document.querySelector('.checkout-submit')?.hasAttribute('disabled'));
    assert.equal(await page.locator('.checkout-submit').innerText(),'去结算(0)');
    decoration.show_title=0;
    await page.evaluate(()=>getApp().$router.push({type:'switchTab',path:'/pages/index/index'}));await page.waitForURL('**/pages/index/index');
    await page.evaluate(()=>getApp().$router.push({type:'switchTab',path:'/pages/goods_cate/goods_cate'}));
    await page.waitForFunction(()=>!document.querySelector('.category-page-title'));
    assert.equal((await page.locator('.category-search-shell').boundingBox()).y,0,'deleting title also removes its space');
    assert.deepEqual(errors,[]);
    console.log('PASS production floating checkout: single/multiple SKU confirmation, amount opens details, preset geometry, navigation clearance, tab refresh and empty guard');
  }finally{await browser.close();server.closeAllConnections();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
