const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.build/ranking-review'),adb=path.join(root,'help/dev/.state/android-tools/platform-tools/adb.exe');
const fixture='http://127.0.0.1:18013',cdp='http://127.0.0.1:19225';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const run=(...args)=>execFileSync(adb,args,{windowsHide:true,timeout:30000,maxBuffer:16*1024*1024});
async function evaluate(match,expression){
 const targets=await(await fetch(cdp+'/json')).json();const target=targets.filter(t=>t.title.includes(match)).sort((a,b)=>Number(b.title.match(/\[(\d+)\]/)?.[1]||0)-Number(a.title.match(/\[(\d+)\]/)?.[1]||0))[0];if(!target)return null;
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.close();reject(Error('CDP evaluation timeout'));},10000);ws.onmessage=e=>{const response=JSON.parse(e.data);if(response.id===1){clearTimeout(timer);ws.close();if(response.result?.exceptionDetails)reject(Error(JSON.stringify(response.result.exceptionDetails)));else resolve(response.result?.result?.value);}};ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));});
}
async function ready(match,expression){for(let i=0;i<60;i++){const value=await evaluate(match,expression);if(value)return value;await pause(400);}throw Error('Native page not ready: '+match);}
async function navigate(url){
 const command=(await(await fetch(fixture+'/__navigate?url='+encodeURIComponent(url))).json()).data;
 for(let i=0;i<40;i++){const ack=(await(await fetch(fixture+'/__status')).json()).data;if(ack.seq===command.seq){assert(!ack.result?.errMsg?.includes('fail'),JSON.stringify(ack));return;}await pause(400);}throw Error('Native navigation timed out');
}
const report=[];
async function capture(name,match,metrics){
 assert(run('shell','dumpsys','activity','activities').toString().includes('io.dcloud.HBuilder/io.dcloud.PandoraEntryActivity'),'must inspect the local Android debug package');
 fs.writeFileSync(path.join(out,'native-'+name+'.png'),run('exec-out','screencap','-p'));
 report.push({name,metrics});fs.writeFileSync(path.join(out,'native-audit.json'),JSON.stringify(report,null,2));console.log('PASS native '+name);
}
(async()=>{
 for(const [id,name,node,text] of [[50,'product-ranking','商品成交量','同步成交'],[51,'shop-ranking','在售商品数','同步在售']]){
  await navigate('/pages/annex/special/index?theme_id='+id);
  const metrics=await ready('special/index',`(()=>{const root=document.querySelector('.ranking-canvas'),text=document.querySelector('[data-node-id="${node}"]');if(!root||root.dataset.fontsReady!=='true'||!text||!text.textContent.includes('${text}'))return null;const stage=root.firstElementChild.firstElementChild;const scale=stage.getBoundingClientRect().width/375;if(Math.abs(scale-root.getBoundingClientRect().width/375)>.01)return null;const images=[...root.querySelectorAll('.rc-image')];if(!images.length||images.some(el=>!el.querySelector('img')?.complete))return null;return {width:root.getBoundingClientRect().width,scale,text:text.textContent,images:images.map(el=>({width:el.offsetWidth,parent:el.parentElement.clientWidth})),borders:root.querySelectorAll('.rc-border').length};})()`);
  assert(metrics.images.every(image=>Math.abs(image.width-image.parent)<=1),'native images must follow their configured width');assert(metrics.borders>=3);
  await capture(name,'special/index',metrics);
 }
 await navigate('/pages/merchant/shop?id=1');
 const shop=await ready('merchant/shop',`(()=>{const root=document.querySelector('.merchant-shop-page');if(!root||!root.textContent.includes('同步搜索店内好物')||!root.textContent.includes('关注好店'))return null;return {text:root.textContent.slice(0,450),theme:getComputedStyle(root).getPropertyValue('--view-theme'),modules:root.querySelectorAll('.merchant-module').length};})()`);
 assert(shop.modules>=4,'new merchant modules must render');assert.equal(shop.theme.trim().toLowerCase(),'#155eef','merchant palette reaches the native page root');await capture('shop-home','merchant/shop',shop);
 await navigate('/pages/goods_details/index?id=4');
 const detail=await ready('goods_details/index',`(()=>{const node=document.querySelector('.rp-detail-name');if(!node||!node.textContent.includes('商品热销榜'))return null;node.scrollIntoView({block:'center'});return {name:node.textContent,fontSize:parseFloat(getComputedStyle(node).fontSize),width:innerWidth,shops:document.querySelectorAll('.merchant-module').length};})()`);
 assert(Math.abs(detail.fontSize-17*detail.width/375)<1,'native detail font must use saved settings');assert(detail.shops>0);await pause(300);await capture('product-detail','goods_details/index',detail);
 for(const layout of [1,2,3]){
  await fetch(fixture+'/__category?layout='+layout);await navigate('/pages/merchant/category?id=1');
  const selector=layout===1?'.productSort':layout===2?'.goodCate:not(.category-style-three)':'.category-style-three';
  const category=await ready('merchant/category',`(()=>{const root=document.querySelector('${selector}'),title=document.querySelector('.shop-category-header .page-title-text');if(!root||!title||!root.textContent.includes('平板电脑'))return null;return {title:title.textContent,content:root.textContent.slice(0,250),width:root.getBoundingClientRect().width,searches:root.querySelectorAll('.category-search-shell').length};})()`);
  assert.equal(category.title,'店铺商品分类');assert(category.searches>0);await capture('shop-category-'+layout,'merchant/category',category);
 }
 await fetch(fixture+'/__category?layout=1');
 console.log('Android native decoration audit complete');
})().catch(error=>{console.error(error);process.exitCode=1;});
