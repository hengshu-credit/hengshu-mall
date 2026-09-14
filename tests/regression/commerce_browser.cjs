const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.build/commerce-hardening-20260914');
process.env.CRMEB_AUDIT_PORT='18126';process.env.CRMEB_AUDIT_H5=path.join(root,'.build/storefront-hardening/h5');
process.env.CRMEB_AUDIT_ROUNDTRIP=path.join(out,'saved-themes.json');process.env.CRMEB_AUDIT_OFFLINE='1';
process.env.CRMEB_AUDIT_SAVED=path.join(out,'preview-themes.json');
const {createServer}=require('./storefront_audit_fixture.cjs');
const {startMedia}=require('./commerce_fixture_services.cjs');
(async()=>{
  require('./commerce_build_assert.cjs')('h5');
  assert(fs.existsSync(process.env.CRMEB_AUDIT_ROUNDTRIP),'Run real MySQL theme save/reload first');
  const media=await startMedia();const fixture=await createServer();const browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[],screenshots=[];
  try{
    const page=await browser.newPage({viewport:{width:412,height:915}});page.on('pageerror',e=>errors.push(e.message));
    const cases=[['home','/pages/index/index','.goodList'],['category','/pages/goods_cate/goods_cate','.category-style-three'],['cart','/pages/order_addcart/order_addcart','.cart-total-label'],['detail','/pages/goods_details/index?id=1','.product-service'],['shop','/pages/merchant/shop?id=1','.merchant-shop-page'],['shop-category','/pages/merchant/category?id=1','.category-style-three']];
    await page.goto(fixture.origin+'/pages/index/index');
    await page.evaluate(()=>{const app=getApp();(app.$store||app.$vm.$store).commit('LOGIN',{token:'audit-only',time:0});});
    for(const [name,url,selector]of cases){
      await page.goto(fixture.origin+url);await page.locator(selector).first().waitFor({timeout:30000});
      await page.getByText(/iPhone 17/).first().waitFor({timeout:30000});
      await page.locator(selector).first().scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>[...document.querySelectorAll('img')].some(i=>i.src.includes('/uploads/')&&i.naturalWidth>0));
      const file=path.join(out,'browser-'+name+'.png');await page.screenshot({path:file});screenshots.push(file);
      await page.reload();await page.locator(selector).first().waitFor({timeout:30000});
      console.log('PASS: current production H5 saved/reloaded '+name);
    }
    for(const url of ['/pages/index/index','/pages/goods_cate/goods_cate','/pages/goods_details/index?id=1']){
      await page.goto(fixture.origin+url);
      const trigger=page.locator('.price-detail-trigger').first();await trigger.waitFor();
      assert.equal(await page.getByText('价格说明 查看',{exact:true}).count(),0);
      const before=page.url();await trigger.click();await page.locator('.price-detail-sheet').waitFor();
      const bounds=await page.locator('.price-detail-sheet').boundingBox();assert(bounds.width>=410&&bounds.x>=-1&&bounds.x<=1,'price detail sheet spans viewport outside product card');
      assert(bounds.y>=0&&bounds.y+bounds.height<=916,'price sheet stays on screen');
      assert.equal(page.url(),before,'price tap must not navigate to product or buy');
      await page.screenshot({path:path.join(out,'browser-price-details-'+(url.includes('details')?'detail':url.includes('cate')?'category':'home')+'.png')});
      await page.locator('.price-detail-done').click();await page.locator('.price-detail-sheet').waitFor({state:'detached'});
    }
    console.log('PASS: inline price opens full-width details without navigating; no separate explanation link');
    for(const width of [320,375,412]){
      await page.setViewportSize({width,height:915});await page.goto(fixture.origin+'/pages/merchant/shop?id=1');
      await page.locator('.shop-header-profile .shop-name').waitFor();
      await page.evaluate(()=>document.querySelector('.shop-header-profile .shop-name').textContent='很长的店铺名称也不会挤压关注按钮和头像');
      const rects=await page.locator('.shop-header-profile').evaluate(el=>{
        const rect=s=>el.querySelector(s).getBoundingClientRect().toJSON();
        return {logo:rect('.shop-avatar,uni-image,img'),name:rect('.shop-text'),follow:rect('.shop-follow-control'),button:rect('.shop-follow-button'),count:rect('.follow-count')};
      });
      assert(rects.name.x>=rects.logo.right+8&&rects.follow.x>=rects.name.right+8,'header keeps explicit space on narrow layouts');
      assert(rects.count.y>=rects.button.bottom+3,'follower count sits below follow button');
      assert(rects.follow.right<=width,'follow control remains visible');
      await page.screenshot({path:path.join(out,'browser-shop-header-'+width+'.png')});
    }
    await page.setViewportSize({width:412,height:915});
    await page.goto(fixture.origin+'/pages/merchant/category?id=1');await page.locator('.category-style-three').waitFor();
    await page.context().setOffline(true);await page.evaluate(()=>getCurrentPages().slice(-1)[0].$vm.load());
    await page.getByText(/读取失败/).first().waitFor();
    await page.context().setOffline(false);await page.getByText(/读取失败/).first().click();await page.locator('.category-style-three').waitFor();
    console.log('PASS: shop category offline error clears stale content and retry restores page');
    await page.goto(fixture.origin+'/pages/merchant/shop?id=1&shop_page_id=42');
    await page.getByText('关注本店',{exact:true}).first().waitFor();
    await page.locator('.shop-header-tabs > :nth-child(2)').click();
    await page.waitForURL(url=>url.pathname==='/pages/merchant/category'&&url.searchParams.get('shop_page_id')==='42');
    await page.getByText('本店分类',{exact:true}).first().waitFor();
    await page.locator('.category-product .product-title').first().click();
    await page.waitForURL(url=>url.pathname==='/pages/goods_details/index'&&url.searchParams.get('shop_page_id')==='42');
    await page.locator('.product-info-diy .merchant-name').first().waitFor();
    assert.equal(await page.locator('.product-info-diy .merchant-enter').first().innerText(),'进店›');
    console.log('PASS: saved merchant preview/navigation/product scope/name policy survives home to category to detail');
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({screenshots,errors,scope:'Current H5 + real MySQL saved configuration + isolated product/cart responses'},null,2));
  }finally{await browser.close();await new Promise(resolve=>fixture.server.close(resolve));media.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
