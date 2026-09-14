// Read-only post-deployment checks. Run against the external URL used by the APK.
const assert=require('node:assert/strict');
const origin=(process.argv[2]||'https://mall.hengshucredit.com').replace(/\/$/,''),shopId=Number(process.argv[3]||1);
const results=[];
async function json(path){const response=await fetch(origin+path,{signal:AbortSignal.timeout(20000)});assert(response.ok,'HTTP '+response.status);const body=await response.json();assert.equal(body.status,200,body.msg);return body.data;}
async function check(name,fn){try{await fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}}
(async()=>{
 await check('mall catalog includes eligible shop products',async()=>{
  const shop=await json('/api/storefront/products?shop_id='+shopId+'&page=1&limit=5');assert(Array.isArray(shop.list));
  if(!shop.list.length)throw Error('Choose a shop with saleable products to verify');
  const ids=shop.list.map(p=>p.id);const catalog=await json('/api/products?ids='+ids.join(',')+'&limit='+ids.length);
  assert(Array.isArray(catalog));for(const id of ids)assert(catalog.some(p=>Number(p.id)===Number(id)),'Missing product '+id+' in unscoped catalog');
 });
 await check('cart navigation follows its saved source',async()=>{
  const [cart,home,nav]=await Promise.all([json('/api/theme_info/cart'),json('/api/theme_info/home'),json('/api/theme/navigation?page=cart')]);
  const source=cart.navigation_source||(cart.navigation?.menuList?'custom':'home');
  const expected=source==='none'?null:source==='custom'?cart.navigation:Object.values(home.value||{}).find(p=>['pageFoot','mainNavigation'].includes(p.name));
  assert.deepEqual(nav.menuList||[],expected?.menuList||[]);
 });
 await check('external image endpoint returns actual PNG bytes',async()=>{
  const products=await json('/api/storefront/products?shop_id='+shopId+'&page=1&limit=20');
  const sample=products.list.find(p=>/\.avif(?:[?#]|$)/i.test(p.image));assert(sample,'Choose a shop with an AVIF product to verify image compatibility');
  const path=new URL(sample.image,origin).pathname;
  const r=await fetch(origin+'/api/media/image?path='+encodeURIComponent(path),{signal:AbortSignal.timeout(20000)});
  const b=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200);assert.match(r.headers.get('content-type')||'',/^image\/png/);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert(b.length>24);
 });
 console.log(JSON.stringify({origin,shopId,results},null,2));if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
