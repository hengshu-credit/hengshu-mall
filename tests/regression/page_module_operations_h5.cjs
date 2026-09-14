const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('playwright');
const { root, transform } = require('./theme_component_harness.cjs');
function shared(name) { const m = {exports:{}}; new Function('module','exports','require',transform(fs.readFileSync(path.join(root,'template/shared',name+'.js'),'utf8')))(m,m.exports,id=>shared(id.replace('./',''))); return m.exports; }
const h5 = process.env.CRMEB_H5_BUILD || path.join(root,'.build/theme-module-operations/h5');
const { searchBoxComponent } = shared('searchBoxComponent');
const search = searchBoxComponent({tipConfig:{value:'独立搜索'}});
let status = 1;
const category = () => shared('categoryPageConfig').normalizeCategoryPage({ status, search_placeholder:'原始搜索', extra_modules:[{id:'search_123',config:search}],content_order:['search','category','search_123'] });
const cart = shared('cartPageConfig').normalizeCartPage({extra_modules:[{id:'service_123',config:{service_labels:['独立服务','独立内容','独立样式'],service_style:shared('componentStyle').commonStyleDefaults()}}],content_order:['service_123','list','service']});
const pic = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#abcdef"/></svg>');
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')) return http.get('http://127.0.0.1:8011'+req.url,response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);}).on('error',()=>{res.writeHead(502);res.end();});
  let file = path.resolve(h5,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(path.resolve(h5)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(h5,'index.html');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:375,height:812}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const u=new URL(route.request().url());let data;
      if(u.pathname==='/api/theme_info/category') data=category();
      else if(u.pathname==='/api/theme_info/cart')data=cart;
      else if(u.pathname==='/api/theme/navigation')data=[];
      else if(u.pathname==='/api/category')data=[{id:1,cate_name:'示例分类',pic,children:[{id:11,cate_name:'示例子分类',pic}]}];
      else if(u.pathname==='/api/products')data=[{id:22,store_name:'示例商品',image:pic,price:99,stock:10,spec_type:0,cart_num:0,activity:null}];
      else if(u.pathname==='/api/cart/count')data={count:1,ids:[101]};
      else if(u.pathname==='/api/cart/list')data={valid:u.searchParams.get('invalid')==='1'?[]:[{id:101,product_id:22,cart_num:1,attrStatus:true,status:true,truePrice:99,productInfo:{id:22,store_name:'示例商品',image:pic,stock:10,price:99}}],invalid:[]};
      else if(u.pathname==='/api/user')data={uid:1,nickname:'测试用户',orderStatusNum:{}};
      else if(u.pathname==='/api/user/set_visit')data={};
      else if(u.pathname==='/api/v2/cart_list')data=[];
      else if(u.pathname==='/api/v2/get_today_coupon')data={list:[]};
      else if(u.pathname==='/api/v2/new_coupon')data={show:false,list:[]};
      else if(route.request().method()!=='GET')return route.fulfill({json:{status:400,msg:'Isolated regression fixture'}});
      else return route.continue();
      return route.fulfill({json:{status:200,data}});
    });
    const base='http://127.0.0.1:'+server.address().port;
    for(status=1;status<=3;status++) {
      await page.goto(base+'/pages/index/index',{waitUntil:'networkidle'});
      await page.evaluate(()=>{getApp().$store.commit('LOGIN',{token:'fixture-only',time:0});getApp().$store.commit('SETUID',1);getApp().$router.push({type:'switchTab',path:'/pages/goods_cate/goods_cate'});});
      await page.waitForFunction(status=>getCurrentPages().at(-1)?.$vm.category===status,status);
      try { await page.locator('.category-search-shell').nth(1).waitFor({timeout:10000}); } catch(error) { console.error({status,errors,debug:await page.evaluate(()=>({text:document.body.innerText.slice(0,1600),category:getCurrentPages().at(-1).$vm.category,config:getCurrentPages().at(-1).$vm.categoryDecoration,searches:[...document.querySelectorAll('.category-search-shell')].map(el=>({text:el.innerText,box:el.getBoundingClientRect().toJSON()}))}))}); throw error; }
      assert.equal(await page.locator('.category-search-shell').count(),2);
      const first=await page.locator('.category-search-shell').first().boundingBox(),last=await page.locator('.category-search-shell').last().boundingBox(),body=await page.locator('.category-module-shell').boundingBox();
      assert.ok(first.y+first.height<=body.y+1,`layout ${status}: first search is above the category`);
      assert.ok(body.y+body.height<=last.y+1,`layout ${status}: copied search is below the category`);
      assert.ok(last.y+last.height<=812,`layout ${status}: repeated search stays on screen`);
      assert.match(await page.locator('.category-search-shell').last().innerText(),/独立搜索/);
      await page.evaluate(()=>{const root=getCurrentPages().at(-1).$vm;root.categoryDecoration.extra_modules[0].config.isHide=true;});
      await page.waitForFunction(()=>document.querySelectorAll('.category-search-shell').length===1);
      console.log(`PASS H5 category ${status}: multiple searches, saved order, viewport fit and independent hiding`);
    }
    await page.evaluate(()=>{getApp().$store.commit('LOGIN',{token:'fixture-only',time:0});getApp().$store.commit('SETUID',1);getApp().$router.push({type:'switchTab',path:'/pages/order_addcart/order_addcart'});});
    await page.locator('.shoppingCart .list .item').first().waitFor();
    assert.equal(await page.locator('.labelNav').count(),2);
    const services=page.locator('.labelNav');
    const original=await services.filter({hasText:'100%正品保证'}).boundingBox(),copy=await services.filter({hasText:'独立服务'}).boundingBox(),list=await page.locator('.shoppingCart .list').boundingBox();
    assert.ok(copy.y+copy.height<=list.y && list.y+list.height<=original.y,'service copy and original follow the saved order around the real cart');
    await page.evaluate(()=>{getCurrentPages().at(-1).$vm.cartDecoration.extra_modules[0].config.service_hidden=true;});
    await page.waitForFunction(()=>document.querySelectorAll('.labelNav').length===1);
    assert.match(await services.innerText(),/100%正品保证/);
    assert.deepEqual(errors,[]);
    console.log('PASS H5 cart: independent service modules surround the real product list and hide independently');
  } finally { await browser.close();server.closeAllConnections();server.close(); }
})().catch(error=>{console.error(error);server.closeAllConnections();server.close();process.exitCode=1;});
