// Isolated Android UI audit, using current production resources and public data snapshots.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.env.CRMEB_AUDIT_OUT||path.join(root,'.build/storefront-audit')),auditPort=String(process.env.CRMEB_AUDIT_PORT||18026),base='http://127.0.0.1:'+auditPort;
const adb=path.join(root,'help/dev/.state/android-tools/platform-tools/adb.exe'),target='/data/user/0/com.hengshucredit.mall/files/apps/__UNI__159D54B/www';
const run=(...args)=>execFileSync(adb,['-s','emulator-5554',...args],{windowsHide:true,timeout:30000,maxBuffer:16*1024*1024});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const get=async url=>(await(await fetch(base+url)).json()).data;
async function navigate(url,login=false,timeout=15000){const started=Date.now(),deadline=started+timeout,c=await get('/__navigate?url='+encodeURIComponent(url)+'&login='+(login?'1':'0'));let last=[];while(Date.now()<deadline){last=(await get('/__reports')).filter(r=>r.seq===c.seq);if(last.some(r=>r.value?.navigated)){if(timeout>15000)console.log('PASS native startup navigation after '+(Date.now()-started)+' ms');await pause(500);return;}await pause(250);}throw Error('Navigation not acknowledged within '+timeout+' ms: '+JSON.stringify(last.slice(-2)));}
async function probe(expression){
 const command=await get('/__probe?expression='+encodeURIComponent(expression));
 for(let i=0;i<40;i++){const rows=(await get('/__reports')).filter(x=>x.seq===command.seq&&x.value);const r=rows.find(x=>x.value.ready===true)||rows.find(x=>x.value.ready===undefined);if(r)return r.value;if(i>=2&&rows.length)return rows[rows.length-1].value;await pause(300);}
 throw Error('Renderer probe timeout: '+expression.slice(0,100));
}
async function ready(expression){let last;for(let i=0;i<12;i++){last=await probe(expression);if(last.ready)return last;await pause(500);}console.error('Last UI state',JSON.stringify(last));fs.writeFileSync(path.join(out,'android-failure.png'),run('exec-out','screencap','-p'));throw Error('Native page did not meet UI criteria');}
async function tap(selector){const rect=await probe(`(()=>{var e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;var r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:innerWidth};})()`);const scale=1080/rect.width;run('shell','input','tap',String(Math.round(rect.x*scale)),String(Math.round(rect.y*scale)));await pause(500);}
const screenshots=[];
async function capture(name,metrics){await pause(400);fs.writeFileSync(path.join(out,'android-'+name+'.png'),run('exec-out','screencap','-p'));screenshots.push({name,metrics});fs.writeFileSync(path.join(out,'android-results.json'),JSON.stringify(screenshots,null,2));console.log('PASS Android '+name);}
async function main(){
 assert.equal(run('shell','getprop','ro.kernel.qemu').toString().trim(),'1');
 const runDir=fs.mkdtempSync(path.join(out,'native-run-'));const backup=path.join(runDir,'backup'),staged=path.join(runDir,'fixture');
 assert(!fs.existsSync(backup),'Do not overwrite the original emulator backup');fs.mkdirSync(backup);
 run('pull',target+'/.',backup);fs.cpSync(path.resolve(process.env.CRMEB_AUDIT_APP||path.join(root,'template/uni-app/unpackage/resources/__UNI__159D54B/www')),staged,{recursive:true});
 fs.copyFileSync(path.join(backup,'manifest.json'),path.join(staged,'manifest.json'));
 function patch(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())patch(file);else if(e.name.endsWith('.js'))fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('https://mall.hengshucredit.com',base));}}
 patch(staged);
 const injection=`;setTimeout(function(){var seen=0;setInterval(function(){uni.request({url:'${base}/__command',success:function(r){var c=r.data.data;if(!c||!c.seq||seen===c.seq)return;seen=c.seq;if(c.url){var app=getApp(),store=app.$store||(app.$vm&&app.$vm.$store);if(c.login){store.commit('LOGIN',{token:'audit-only',time:0});store.commit('SETUID',9999);}uni.reLaunch({url:c.url,success:function(){uni.request({url:'${base}/__report',method:'POST',data:{seq:c.seq,value:{navigated:true}},fail:function(){seen=0;}});},fail:function(error){seen=0;uni.request({url:'${base}/__report',method:'POST',data:{seq:c.seq,error:error.errMsg||'navigation failed'}});}});}if(c.expression){var script='(function(){try{var v=('+c.expression+');if(v)fetch("${base}/__report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({seq:'+c.seq+',value:v})});}catch(e){fetch("${base}/__report",{method:"POST",body:JSON.stringify({seq:'+c.seq+',error:e.message})});}})();';plus.webview.all().forEach(function(w){w.evalJS(script);});}}});},250);},1200);`;
 fs.appendFileSync(path.join(staged,'app-service.js'),injection);
 run('reverse','tcp:'+auditPort,'tcp:'+auditPort);run('shell','am','force-stop','com.hengshucredit.mall');
 try{
  run('push',staged+'/.',target);run('shell','am','start','-n','com.hengshucredit.mall/io.dcloud.PandoraEntry');await pause(2000);
  if(!process.env.CRMEB_AUDIT_SCOPE_ONLY && !process.env.CRMEB_AUDIT_SQUARE_ONLY && !process.env.CRMEB_AUDIT_TABS_ONLY){
  await navigate('/pages/index/index',false,60000);
  if(process.env.CRMEB_AUDIT_FIRST_SCREEN){
   const firstScreen=await ready(`(()=>{var cards=[...document.querySelectorAll('.menu .easy-loadimage')].filter(e=>{var r=e.getBoundingClientRect();return r.width>0&&r.top<innerHeight&&r.bottom>0;});var loaded=cards.filter(e=>{var image=e.querySelector('.origin-img'),img=image&&image.querySelector('img');return image&&getComputedStyle(image).display!=='none'&&img&&img.naturalWidth>0;});return {ready:cards.length>0&&loaded.length===cards.length,cards:cards.length,loaded:loaded.length};})()`);
   await capture('home-first-screen',firstScreen);
  }
  const home=await ready(`(()=>{var list=document.querySelectorAll('.goodList');if(!list.length)return {ready:false};var last=list[list.length-1],imgs=[...last.querySelectorAll('img')].filter(i=>i.src.includes('/api/media/image'));last.scrollIntoView({block:'center'});return {ready:last.textContent.includes('iPhone 17')&&imgs.some(i=>i.naturalWidth>0),headers:document.querySelectorAll('.goodList .header-box').length,products:last.textContent,images:imgs.map(i=>({loaded:i.naturalWidth>0,width:i.getBoundingClientRect().width}))};})()`);
  assert.equal(home.headers,0);for(let i=0;i<5;i++){run('shell','input','swipe','500','1450','500','450','350');await pause(300);}await capture('home',home);
  await ready(`(()=>{var price=document.querySelector('.goodList .price-detail-trigger');if(!price)return {ready:false};price.scrollIntoView({block:'center'});return {ready:true};})()`);
  await tap('.goodList .price-detail-trigger');
  const priceDetails=await ready(`(()=>{var sheet=document.querySelector('.price-detail-sheet');if(!sheet)return {ready:false};var r=sheet.getBoundingClientRect();return {ready:sheet.textContent.includes('当前售价'),text:sheet.textContent,width:r.width,left:r.left,bottom:r.bottom,viewport:innerWidth,height:innerHeight};})()`);
  assert(Math.abs(priceDetails.width-priceDetails.viewport)<2);assert(priceDetails.bottom<=priceDetails.height+2);await capture('price-details',priceDetails);await tap('.price-detail-close');
  await navigate('/pages/goods_cate/goods_cate');
  const category=await ready(`(()=>{var root=document.querySelector('.category-style-three');if(!root)return {ready:false};var imgs=[...root.querySelectorAll('img')].filter(i=>i.src.includes('/api/media/image'));return {ready:root.textContent.includes('iPhone 17')&&imgs.some(i=>i.naturalWidth>0),text:root.textContent.slice(0,600),images:imgs.map(i=>i.naturalWidth)};})()`);await capture('category',category);
  await navigate('/pages/order_addcart/order_addcart',true);
  const cart=await ready(`(()=>{var nav=document.querySelector('.footer-dock'),items=document.querySelectorAll('.foot-item'),imgs=[...document.querySelectorAll('img')].filter(i=>i.src.includes('/api/media/image'));return {ready:items.length===4&&document.body.textContent.includes('iPhone 17')&&imgs.some(i=>i.naturalWidth>0),navigation:nav&&nav.getBoundingClientRect().toJSON(),items:items.length,images:imgs.map(i=>i.naturalWidth),width:innerWidth,height:innerHeight};})()`);await capture('cart',cart);
  await tap('.footer-dock .foot-item:nth-child(2)');await ready(`({ready:!!document.querySelector('.category-style-three')})`);
  await get('/__navigation?source=none');await navigate('/pages/order_addcart/order_addcart',true);
  const hiddenNav=await ready(`({ready:document.body.textContent.includes('购物车合计')&&!document.querySelector('.footer-dock'),footers:document.querySelectorAll('.footer-dock').length})`);await capture('cart-hidden-navigation',hiddenNav);await get('/__navigation?source=home');
  await navigate('/pages/goods_details/index?id=1');
  const detail=await ready(`(()=>{var root=document.querySelector('.product-service'),imgs=[...document.querySelectorAll('.product-info-diy img')].filter(i=>i.src.includes('/api/media/image'));if(!root)return {ready:false};root.scrollIntoView({block:'center'});return {ready:root.querySelectorAll('.item').length===4,labels:[...root.querySelectorAll('.label')].map(e=>e.textContent.trim()),text:root.textContent,images:imgs.map(i=>i.naturalWidth)};})()`);
  assert.deepEqual(detail.labels,['活动','选择','参数','服务']);assert(detail.text.includes('Apple'));assert(detail.text.includes('暂无活动'));await capture('detail-service',detail);
  await tap('.product-service .item:nth-child(3)');
  const parameterPopup=await ready(`(()=>{var p=document.querySelector('.tui-drawer-bottom__show');return {ready:!!p&&p.textContent.includes('100278221408'),text:p&&p.textContent};})()`);await capture('parameter-popup',parameterPopup);
  await tap('.tui-drawer-bottom__show .mx-20 .mt-52');
  await capture('parameter-closed',await ready(`({ready:!document.querySelector('.tui-drawer-bottom__show')&&!!document.querySelector('.product-service')})`));
  await tap('.product-service .item:nth-child(2)');
  const selectionPopup=await ready(`(()=>{var p=document.querySelector('.product-window-layer.is-open');return {ready:!!p,text:p&&p.textContent};})()`);await capture('selection-popup',selectionPopup);await tap('.product-window-layer.is-open .icon-guanbi');
  const description=await ready(`(()=>{var root=document.querySelector('.product-intro');if(!root)return {ready:false};var imgs=[...root.querySelectorAll('img')];if(imgs[0])imgs[0].scrollIntoView({block:'start'});return {ready:imgs.length>0&&imgs.every(i=>i.naturalWidth>0),images:imgs.map(i=>({src:i.src,width:i.getBoundingClientRect().width,natural:i.naturalWidth}))};})()`);await capture('description',description);
  await navigate('/pages/merchant/shop?id=1');
  const shop=await ready(`(()=>{var root=document.querySelector('.merchant-shop-page');if(!root)return {ready:false};var imgs=[...root.querySelectorAll('img')].filter(i=>i.src.includes('/api/media/image'));return {ready:root.textContent.includes('iPhone 17')&&imgs.some(i=>i.naturalWidth>0),titles:root.querySelectorAll('.page-title-bar').length,images:imgs.map(i=>i.naturalWidth)};})()`);assert.equal(shop.titles,0);await capture('shop',shop);
  const headerSpacing=await probe(`(()=>{var el=document.querySelector('.shop-header-profile'),r=s=>el.querySelector(s).getBoundingClientRect().toJSON();return {logo:r('.shop-avatar,uni-image,img'),name:r('.shop-text'),follow:r('.shop-follow-control'),button:r('.shop-follow-button'),count:r('.follow-count')};})()`);
  assert(headerSpacing.name.x>=headerSpacing.logo.right+8);assert(headerSpacing.follow.x>=headerSpacing.name.right+8);assert(headerSpacing.count.y>=headerSpacing.button.bottom+3);
  await navigate('/pages/merchant/category?id=1');
  const shopCategory=await ready(`(()=>{var root=document.querySelector('.category-style-three');if(!root)return {ready:false};var imgs=[...root.querySelectorAll('img')].filter(i=>i.src.includes('/api/media/image'));return {ready:root.textContent.includes('iPhone 17')&&imgs.some(i=>i.naturalWidth>0),titles:document.querySelectorAll('.page-title-bar').length,extraTitles:document.querySelectorAll('.shop-nav-title').length};})()`);assert.equal(shopCategory.titles,1);assert.equal(shopCategory.extraTitles,0);await capture('shop-category',shopCategory);
  }
  if(process.env.CRMEB_AUDIT_SQUARE_ONLY){
   for(const [name,url] of [['platform','/pages/goods_cate/goods_cate'],['shop','/pages/merchant/category?id=1&shop_page_id=42']]){
    await navigate(url);
    const square=await ready(`(()=>{var body=document.querySelector('.category-module-shell > .conter'),aside=document.querySelector('.category-module-shell .aside');if(!body||!aside)return {ready:false};var style=getComputedStyle(body);return {ready:body.textContent.includes('iPhone 17'),corners:[style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomRightRadius,style.borderBottomLeftRadius],sidebar:aside.getBoundingClientRect().toJSON()};})()`);
    assert.deepEqual(square.corners,['0px','0px','0px','0px']);await capture('square-'+name+'-category',square);
   }
  }
  if(process.env.CRMEB_AUDIT_TABS_ONLY){
   await navigate('/pages/merchant/shop?id=1&shop_page_id=42');
   const tabProducts=await ready(`(()=>{var root=document.querySelector('.index-product-wrapper'),shops=document.querySelectorAll('.merchant-module');if(!root||!shops.length)return {ready:false};root.scrollIntoView({block:'center'});var tab=root.parentElement.getBoundingClientRect(),shop=shops[shops.length-1].parentElement.getBoundingClientRect();return {ready:root.textContent.includes('iPhone 17'),text:root.textContent,tabLeft:tab.left,tabRight:innerWidth-tab.right,shopLeft:shop.left,shopRight:innerWidth-shop.right};})()`);
   if(process.env.CRMEB_AUDIT_MARGIN_CHECK){assert(Math.abs(tabProducts.tabLeft-tabProducts.shopLeft)<1);assert(Math.abs(tabProducts.tabRight-tabProducts.shopRight)<1);assert(tabProducts.tabLeft>0);}
   if(process.env.CRMEB_AUDIT_CARD_CHECK){
    const card=await ready(`(()=>{var root=document.querySelector('.index-product-wrapper'),row=root&&root.querySelector('.goodList .list .item');if(!root||!row)return {ready:false};var surface=root.parentElement,s=getComputedStyle(surface),r=row.getBoundingClientRect(),images=[...row.querySelectorAll('img')].filter(i=>i.src.includes('/api/media/image'));return {ready:r.width>innerWidth*.7&&r.height<r.width&&images.some(i=>i.naturalWidth>0),radius:s.borderTopLeftRadius,padding:s.paddingLeft,top:s.marginTop,bottom:s.marginBottom,viewport:innerWidth,width:r.width,height:r.height,decodedImages:images.map(i=>i.naturalWidth)};})()`);
    for(const [key,design] of [['radius',12],['padding',12],['top',10],['bottom',10]])assert(Math.abs(parseFloat(card[key])-design*card.viewport/375)<1,key+' follows responsive design units');Object.assign(tabProducts,{card});
   }
   await capture('shop-product-tabs',tabProducts);
   await tap('.index-product-wrapper .nav-bd .item:nth-child(2)');
   const emptyTab=await ready(`(()=>{var root=document.querySelector('.index-product-wrapper'),active=root&&root.querySelector('.nav-bd .item.on');if(root)root.scrollIntoView({block:'end'});return {ready:!!root&&!!active&&active.textContent.includes('空选择')&&!root.textContent.includes('iPhone 17'),text:root&&root.textContent};})()`);
   run('shell','input','swipe','500','1450','500','650','300');
   const visibleTab=await ready(`(()=>{var el=document.querySelector('.index-product-wrapper .nav-bd-box');if(!el)return {ready:false};var r=el.getBoundingClientRect();return {ready:r.height>0&&r.top<innerHeight&&r.bottom>0,height:r.height,top:r.top,bottom:r.bottom};})()`);
   if(process.env.CRMEB_AUDIT_CARD_CHECK)await ready(`({ready:!!document.querySelector('.index-product-wrapper .tab-products-empty')&&document.querySelector('.index-product-wrapper .tab-products-empty').textContent.includes('暂无商品')})`);
   await capture('shop-empty-product-tab',{...emptyTab,...visibleTab});
   const tabRequests=(await get('/__requests')).requests.filter(url=>url.includes('/api/products?')&&url.includes('ids=1'));
   assert(tabRequests.some(url=>url.includes('seller_shop_id=1')),'tab product request retains current shop');
  }
  if(process.env.CRMEB_AUDIT_SAVED && !process.env.CRMEB_AUDIT_SQUARE_ONLY && !process.env.CRMEB_AUDIT_TABS_ONLY){
   await navigate('/pages/merchant/shop?id=1&shop_page_id=42');
   const previewShop=await ready(`(()=>{var root=document.querySelector('.merchant-shop-page'),heading=document.querySelector('.shop-heading'),input=document.querySelector('.merchant-shop-page input');return {ready:!!root&&root.textContent.includes('关注本店')&&!!heading,layout:heading&&getComputedStyle(heading).flexDirection,placeholder:input&&input.placeholder};})()`);
   assert.equal(previewShop.layout,'column');await capture('preview-shop',previewShop);
   await tap('.shop-header-tabs > :nth-child(2)');
   const previewCategory=await ready(`(()=>{var nav=document.querySelector('.footer-dock'),products=document.querySelector('.category-products');return {ready:!!nav&&nav.textContent.includes('本店分类')&&!!products,menus:nav&&nav.textContent,layout:products&&products.className};})()`);
   assert(previewCategory.layout.includes('list'));await capture('preview-category',previewCategory);
   await tap('.category-product .product-title');
   const previewDetail=await ready(`(()=>{var label=document.querySelector('.product-info-diy .merchant-name');return {ready:!!label&&label.textContent.includes('平台商城'),label:label&&label.textContent};})()`);await capture('preview-detail',previewDetail);
   const trail=(await get('/__requests')).requests;
   assert(trail.some(url=>url.includes('storefront/shop/1/theme/category')&&url.includes('shop_page_id=42')));
   assert(trail.some(url=>url.includes('storefront/product/1/theme')&&url.includes('shop_page_id=42')));
  }
  const results=await get('/__requests');assert(results.imageResults.length>0&&results.imageResults.every(x=>x.status===200&&((x.png&&x.type==='image/png')||(x.jpeg&&x.type==='image/jpeg')||(x.avif&&x.type==='image/avif'))),'every requested image has matching format bytes and Content-Type');
 }finally{
  run('shell','am','force-stop','com.hengshucredit.mall');run('push',backup+'/.',target);run('reverse','--remove','tcp:'+auditPort);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
