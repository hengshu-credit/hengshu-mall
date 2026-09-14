const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, compiler, transform } = require('./theme_component_harness.cjs');
const { loadShared } = require('./ranking_shared_loader.cjs');
const { preprocess } = require(path.join(root, 'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
const api = {}, jumps = [], storage = {};
const uni = { getStorageSync: key => storage[key], getWindowInfo: () => ({statusBarHeight:0}), navigateTo: ({url}) => jumps.push(url), $on() {}, $off() {} };
function load(file, platform = {APP_PLUS:true, APP:true}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const sfc = compiler.parseComponent(source);
  const template = preprocess(sfc.template.content, platform, {type:'html'});
  assert.deepEqual(compiler.compile(template).errors, [], file);
  const mod = {exports:{}};
  new Function('module','exports','require','uni','getApp', transform(preprocess(sfc.script.content, platform, {type:'js'})))(mod, mod.exports, id => {
    if (id.includes('shared/')) return loadShared(id.split('/').pop());
    if (id === 'vuex') return {mapGetters:()=>({}),mapState:()=>({})};
    if (id.startsWith('@/api/')) return api;
    if (id.includes('merchantTheme')) return {merchantPaletteStyle:palette=>palette ? 'theme:'+palette.theme_color : ''};
    if (id.includes('validate')) return {Throttle:fn=>fn};
    if (id.includes('config/app')) return {HTTP_REQUEST_URL:'https://mall.test'};
    return {};
  },uni,()=>({globalData:{}}));
  return {...mod.exports.default, template};
}
function state(options, props = {}) {
  const vm = {$config:{LIMIT:10},$util:{getWXStatusHeight:()=>({}),JumpPath:url=>jumps.push(url),$h:{Add:(a,b)=>+a + +b,Mul:(a,b)=>+a * +b}},$t:s=>s,$set:(obj,key,value)=>{obj[key]=value;},$store:{state:{app:{uid:0}}},...props};
  Object.assign(vm, options.data ? options.data.call(vm) : {});
  Object.entries(options.methods || {}).forEach(([key, fn]) => vm[key] = fn.bind(vm));
  Object.entries(options.computed || {}).forEach(([key, fn]) => { if (typeof fn === 'function') Object.defineProperty(vm,key,{get:()=>fn.call(vm),configurable:true}); });
  return vm;
}
const tick = () => new Promise(setImmediate);

test('detail uses the platform decoration on an older server; errors are retryable', async () => {
  const vm = state(load('template/uni-app/pages/goods_details/index.vue'));
  vm.id = 7; storage.previewThemeId = 12;
  const page = {value:{one:{name:'productInfo'}}}, requests=[];
  api.getMerchantProductTheme = async () => {throw new Error('404');};
  api.getThemeInfo = async (type, params) => {requests.push({type,params});return {data:page};};
  await vm.getDiyData();
  assert.equal(vm.themeStatus,'ready'); assert.equal(vm.diyData,page);
  assert.deepEqual(requests,[{type:'detail',params:{theme_id:12}}]);
  api.getThemeInfo = async () => {throw new Error('offline');};
  await vm.getDiyData(); assert.equal(vm.themeStatus,'error'); assert.equal(vm.themeError,'offline');
  api.getMerchantProductTheme = async () => ({data:{page,palette:{theme_color:'#123456'},shop_id:42}});
  await vm.getDiyData(); assert.equal(vm.themeStatus,'ready'); assert.equal(vm.merchantShopId,42);
  assert.equal(vm.merchantStyle,'theme:#123456'); delete storage.previewThemeId;
});

test('hidden/deleted modules and backgrounds disappear when the decoration changes', () => {
  assert.deepEqual(loadShared('componentStyle').componentStyle(null),loadShared('componentStyle').componentStyle({}));
  const options = load('template/uni-app/subpackage/diyComponents/pageDesign.vue');
  const vm = state(options);
  vm.setDiyData({is_bg_color:1,color_picker:'#123456',is_bg_pic:1,bg_pic:'/x.png',value:{a:{name:'richText',timestamp:3},b:{name:'videos',timestamp:2},c:{name:'mainNavigation',isHide:true},d:null}});
  assert.deepEqual(vm.styleConfig.map(item=>item.name),['videos','richText']);
  assert.equal(vm.footerConfigData,null);
  assert.match(options.template,/<richText/);assert.match(options.template,/<videos/);
  vm.setDiyData({value:{nav:{name:'mainNavigation'}}}); assert.ok(vm.footerConfigData);
  vm.setDiyData({title:'Empty'}); assert.equal(vm.styleConfig.length,0);assert.equal(vm.footerConfigData,null);assert.equal(vm.bgPic,'');assert.equal(vm.bgColor,'');
});

test('selected products keep their order, ignore unrelated API results and stale replies', async () => {
  const options=load('template/uni-app/subpackage/diyComponents/goodList.vue');
  const config=load('template/admin/src/components/mobilePage/home_goods_list.vue',{}).data.call({num:1}).defaultConfig;
  config.goodsList.list=[{id:2},{id:1},{id:3}];
  const vm=state(options,{dataConfig:config,list:null,shopId:0});
  const pending=[];api.getProductslist=params=>new Promise(resolve=>pending.push({params,resolve}));
  vm.productslist(); assert.equal(pending[0].params.limit,3);
  pending[0].resolve({data:[{id:1},{id:99},{id:2}]});await tick();
  assert.deepEqual(vm.tempArr.map(x=>x.id),[2,1]);assert.equal(vm.headerText,'');
  vm.dataConfig.headerText={value:'本周精选'};assert.equal(vm.headerText,'本周精选');
  vm.productslist();vm.list=[{id:8}];options.watch.list.handler.call(vm,vm.list);
  pending[1].resolve({data:[{id:2}]});await tick();assert.deepEqual(vm.tempArr.map(x=>x.id),[8]);
  vm.list=[];options.watch.list.handler.call(vm,[]);assert.equal(vm.tempArr.length,0);
  config.name='goodRecommend';config.styleConfig.tabVal=3;assert.equal(vm.goodStyleConfig,5);
  config.headerText.value='';assert.equal(vm.headerText,'');
});

test('cart shop selection, original row indexes, quantities and checkout quote stay consistent', async () => {
  const vm=state(load('template/uni-app/pages/order_addcart/order_addcart.vue'));
  const row=(id,shop,price,quantity,status=true)=>({id,product_id:id,truePrice:price,cart_num:quantity,attrStatus:status,checked:false,productInfo:{seller_shop_id:shop,merchant_name:'店铺'+shop,image:'/main.png',attrInfo:{image:''}}});
  vm.cartList.valid=[row(1,8,'0.10',3),row(2,9,'20.25',2),row(3,8,'0.20',2),row(4,8,'99',1,false),row(5,0,'5.00',1)];
  const quotes=[];api.getFullReductionQuote=async ids=>{quotes.push(ids);return {data:{pay_price:'40.20',full_reduction_price:'1.00'}};};
  assert.equal(vm.cartShops.length,3);assert.equal(vm.cartShops[2].name,'平台自营');
  vm.selectShop(vm.cartShops[0],{detail:{value:['shop-8']}});await tick();
  assert.deepEqual(vm.selectValue,[1,3]);assert.equal(vm.cartShops[0].subtotal,'0.70');assert.equal(vm.cartShops[0].quantity,5);
  assert.equal(vm.cartList.valid.indexOf(vm.cartShops[0].items[1]),2);
  vm.checkboxChange({detail:{value:['2']}},vm.cartShops[1]);await tick();
  assert.deepEqual(vm.selectValue,[1,2,3]);assert.deepEqual(quotes.at(-1),['1','2','3']);assert.equal(vm.selectCountPrice,'40.20');
  vm.selectShop(vm.cartShops[0],{detail:{value:[]}});await tick();assert.deepEqual(vm.selectValue,[2]);
  vm.checkboxAllChange({detail:{value:['all']}});await tick();assert.deepEqual(vm.selectValue,[1,2,3,5]);assert.equal(vm.isAllSelect,true);
  assert.equal(vm.cartProductImage(vm.cartList.valid[0]),'/main.png');
  vm.openCartShop(vm.cartShops[1]);assert.equal(jumps.at(-1),'/pages/merchant/shop?id=9');
  vm.footerswitch=false;vm.selectShop(vm.cartShops[0],{detail:{value:['shop-8']}});assert.ok(vm.selectValue.includes(4));
});

test('link picker emits followed shops, selected shops and current-product shop links', () => {
  const vm=state(load('template/admin/src/components/linkaddress/index.vue',{}));
  const emitted=[];vm.$emit=(event,value)=>emitted.push([event,value]);
  vm.getUrl(vm.merchantLinks[0]);vm.ok();assert.deepEqual(emitted.at(-1),['linkUrl','/pages/merchant/followed']);
  vm.selectMerchantLink(19);vm.ok();assert.equal(emitted.at(-1)[1],'/pages/merchant/shop?id=19');
  const {merchantLink}=loadShared('merchantLinks');
  assert.equal(merchantLink('/pages/merchant/shop?from=product',42),'/pages/merchant/shop?id=42');
  assert.equal(merchantLink('/pages/merchant/shop?id=19',42),'/pages/merchant/shop?id=19');
});

test('Android image URL adaptation preserves originals and external hosts', () => {
  const {displayMedia}=loadShared('displayMedia');
  const origin='https://mall.test',source={image:origin+'/uploads/a.avif',slides:['/uploads/b.avif','/uploads/c.png'],description:'<img src="/uploads/d.avif">',external:'https://cdn.test/a.avif'};
  const result=displayMedia(source,origin);
  assert.equal(result.image,origin+'/api/media/image?path=%2Fuploads%2Fa.avif');
  assert.equal(result.slides[0],origin+'/api/media/image?path=%2Fuploads%2Fb.avif');
  assert.equal(result.slides[1],source.slides[1]);assert.equal(result.external,source.external);
  assert.match(result.description,/api\/media\/image\?path=%2Fuploads%2Fd.avif/);assert.equal(source.image,origin+'/uploads/a.avif');
  assert.deepEqual(displayMedia(result,origin),result,'display URL rewrite is idempotent');
  assert.equal(displayMedia(origin+'/_compat/images/uploads/a.avif',origin),result.image,'cached legacy display URL migrates to the API route');
});

test('admin preview refreshes saved product snapshots without changing the selection', async () => {
  const mod={exports:{}};
  new Function('module','exports','require',transform(fs.readFileSync(path.join(root,'template/admin/src/mixins/decorationProducts.js'),'utf8')))(mod,mod.exports,id=>id.includes('shared/')?loadShared(id.split('/').pop()):api);
  const vm=state(mod.exports.default), pending=[];
  api.getProProduct=query=>new Promise(resolve=>pending.push({query,resolve}));
  const config=load('template/admin/src/components/mobilePage/home_goods_list.vue',{}).data.call({num:1}).defaultConfig;
  config.goodsList.list=[{id:2,store_name:'旧名称'},{id:1,store_name:'旧名称'}];
  vm.refreshPreviewProducts(config);await tick();
  pending[0].resolve({data:[{id:1,store_name:'当前名称',image:'/current.png'}]});await tick();
  assert.deepEqual(vm.list.map(item=>item.store_name),['当前名称']);
  assert.match(vm.productPreviewMessage,/下架或删除/);
  assert.deepEqual(config.goodsList.list.map(item=>item.id),[2,1]);
  vm.refreshPreviewProducts({...config,goodsList:{list:[]}});assert.equal(vm.list.length,0);assert.match(vm.productPreviewMessage,/请选择/);
});
