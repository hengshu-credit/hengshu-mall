const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const out=path.resolve(__dirname,'../../.build/storefront-audit'),base='http://127.0.0.1:'+(process.env.CRMEB_AUDIT_PORT||18026);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:412,height:915}});page.on('pageerror',e=>{errors.push(e.message);console.error(page.url(),e.stack);});
  await page.goto(base+'/pages/index/index');await page.locator('.goodList .list').last().waitFor({timeout:20000});
  assert.equal(await page.locator('.goodList .header-box').count(),0,'legacy lists do not invent recommendation headings');
  assert((await page.locator('.goodList .list').last().innerText()).includes('iPhone 17'),'selected live product renders');
  await page.locator('.goodList').last().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'h5-home.png')});
  await page.locator('.footer-dock .foot-item').filter({hasText:'分类'}).click();
  await page.waitForURL('**/pages/goods_cate/goods_cate');await page.getByText(/iPhone 17/).first().waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('img')].some(i=>i.src.includes('/uploads/')&&i.naturalWidth>0));
  await page.screenshot({path:path.join(out,'h5-category.png')});
  await page.evaluate(()=>{const app=getApp();(app.$store||app.$vm.$store).commit('LOGIN',{token:'audit-only',time:0});});
  await page.locator('.footer-dock .foot-item').filter({hasText:'购物车'}).click();await page.waitForURL('**/pages/order_addcart/order_addcart');
  await page.getByText(/iPhone 17/).first().waitFor();assert.equal(await page.locator('.footer-dock .foot-item').count(),4);
  await page.screenshot({path:path.join(out,'h5-cart.png')});
  await page.getByText(/iPhone 17/).first().click();await page.waitForURL('**/pages/goods_details/index?id=1');
  await page.locator('.product-service .item').first().waitFor();
  assert.deepEqual(await page.locator('.product-service .label').allTextContents(),['活动','选择','参数','服务']);
  assert((await page.locator('.product-service').innerText()).includes('暂无活动'));assert((await page.locator('.product-service').innerText()).includes('Apple'));
  await page.locator('.product-service').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'h5-detail-service.png')});
  await page.locator('.product-intro').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{const imgs=[...document.querySelectorAll('.product-intro img')];return imgs.length>0&&imgs.every(i=>i.naturalWidth>0);});
  await page.screenshot({path:path.join(out,'h5-description.png')});
  await page.goto(base+'/pages/merchant/shop?id=1');await page.getByText(/iPhone 17/).first().waitFor();
  assert.equal(await page.locator('.page-title-bar').count(),0,'default shop header does not gain another page title');
  await page.screenshot({path:path.join(out,'h5-shop.png')});
  await page.getByText('店铺分类',{exact:true}).first().click();await page.waitForURL('**/pages/merchant/category?id=1');
  await page.getByText(/iPhone 17/).first().waitFor();
  assert.equal(await page.locator('.shop-nav-title').count(),0);assert.equal(await page.locator('.page-title-bar').count(),1);
  await page.screenshot({path:path.join(out,'h5-shop-category.png')});
  assert.deepEqual(errors,[]);console.log('PASS H5: actual saved home/category/cart/detail/shop pages, product data, navigation clicks, service rows and decoded description images');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
