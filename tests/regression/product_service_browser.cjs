const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {root,transform,compiler}=require('./theme_component_harness.cjs');
const h5=path.join(root,'.build/commerce-ui/h5');
function shared(name){const m={exports:{}};new Function('module','exports','require',transform(fs.readFileSync(path.join(root,'template/shared',name+'.js'),'utf8')))(m,m.exports,id=>shared(id.replace('./','')));return m.exports;}
const m={exports:{}};
new Function('module','exports','require',transform(compiler.parseComponent(fs.readFileSync(path.join(root,'template/admin/src/components/mobilePage/home_product_service.vue'),'utf8')).script.content))(m,m.exports,id=>id==='vuex'?{mapState:()=>({})}:id.includes('shared/')?shared(id.split('/').pop()):{});
const config=m.exports.default.data.call({num:1}).defaultConfig;
config.checkBoxConfig.type=['0','1','2','3'];
const theme={actions_mode:'components',navigation_mode:'page',value:{0:shared('pageTitleComponent').pageTitleComponent({title:'商品详情'},0),1:config}};
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://local');
  if(u.pathname.startsWith('/api/'))return http.get('http://127.0.0.1:8011'+req.url,r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  let file=path.resolve(h5,'.'+u.pathname);if(!file.startsWith(h5+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(h5,'index.html');
  res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  const product=await new Promise((resolve,reject)=>http.get('http://127.0.0.1:8011/api/product/detail/4',res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve(JSON.parse(body).data));}).on('error',reject));
  product.storeInfo.params_list=[{name:'材质',value:'不锈钢'},{name:'尺寸和其他较长的参数名称用于验证单行省略显示',value:'80ml'}];
  product.storeInfo.protection_list=[{title:'正品保障',content:'支持正品查验',image:''},{title:'七天无理由退换货及其他较长的服务名称',content:'按商品规则提供售后服务',image:''}];
  product.activity=[{type:1,id:11},{type:2,id:12},{type:3,id:13}];product.coupons=[];
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:375,height:812}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const u=new URL(route.request().url());let data;
      if(u.pathname==='/api/theme_info/detail')data=theme;
      else if(u.pathname==='/api/theme/navigation')data=[];
      else if(u.pathname==='/api/product/detail/4')data=product;
      else if(u.pathname.startsWith('/api/product/real_price/'))data={real_price:3999,member_price:3999,ot_price:4799};
      else if(u.pathname==='/api/cart/count')data={count:0,ids:[]};
      else if(route.request().method()!=='GET')data={};
      else return route.continue();
      return route.fulfill({json:{status:200,msg:'成功',data}});
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/pages/goods_details/index?id=4');
    await page.waitForFunction(()=>document.querySelectorAll('.service-list > .item').length===4);
    assert.deepEqual(await page.locator('.service-list .label').allTextContents(),['活动','选择','参数','服务']);
    assert.match(await page.locator('.tags-wrapper').innerText(),/限时秒杀.*参与砍价.*拼团活动/s);
    const layout=await page.locator('.service-list > .item').evaluateAll(rows=>rows.map(row=>{const label=row.querySelector('.label'),content=row.querySelector('.content'),arrow=content.lastElementChild;return {label:label.getBoundingClientRect().width,padding:getComputedStyle(row).paddingTop,arrowFits:arrow.getBoundingClientRect().right<=content.getBoundingClientRect().right+1};}));
    assert(layout.every(row=>row.label===40&&row.padding==='12px'&&row.arrowFits),'labels and arrows keep their editor dimensions for long text');
    assert.doesNotMatch(await page.locator('.service-list > .item').nth(2).innerText(),/·\s*$/);
    await page.locator('.service-list > .item').nth(2).click();
    await page.locator('.tui-drawer-bottom__show').filter({hasText:'材质'}).waitFor();
    await page.locator('.tui-drawer-bottom__show').getByText('知道了',{exact:true}).click();
    await page.locator('.service-list > .item').nth(3).click();
    await page.locator('.tui-drawer-bottom__show').filter({hasText:'服务保障'}).waitFor();
    await page.locator('.tui-drawer-bottom__show').getByText('知道了',{exact:true}).click();
    await page.evaluate(()=>{const find=vm=>vm.$options.name==='homeProductService'?vm:vm.$children.map(find).find(Boolean);const service=find(getCurrentPages().at(-1).$vm);window.activityEvent=null;service.$on('goActivity',value=>{window.activityEvent=value;});});
    await page.locator('.service-list > .item').first().locator('.content > .iconfont').click();
    await page.waitForFunction(()=>window.activityEvent && window.activityEvent.type==='1');
    assert.deepEqual(errors,[]);
    console.log('PASS product service: numeric activities, 4 configured rows, long-text layout, parameter/service drawers and activity row action');
  } finally {await browser.close();server.closeAllConnections();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
