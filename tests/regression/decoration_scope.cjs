const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {root,compiler,transform}=require('./theme_component_harness.cjs');
const {loadShared}=require('./ranking_shared_loader.cjs');
const {preprocess}=require(path.join(root,'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
const api={},storage={},interceptors={};let pages=[];
const uni={getStorageSync:key=>storage[key],setStorageSync:(key,v)=>storage[key]=v,addInterceptor:(key,v)=>interceptors[key]=v,getWindowInfo:()=>({statusBarHeight:0}),$on(){},$off(){}};
function load(file,platform={APP_PLUS:true,APP:true}) {
  const source=fs.readFileSync(path.join(root,file),'utf8'),sfc=file.endsWith('.vue')?compiler.parseComponent(source):null;
  const template=sfc?preprocess(sfc.template.content,platform,{type:'html'}):'';
  if(sfc)assert.deepEqual(compiler.compile(template).errors,[],file);
  const mod={exports:{}};
  new Function('module','exports','require','uni','getCurrentPages','getApp',transform(preprocess(sfc?sfc.script.content:source,platform,{type:'js'})))(mod,mod.exports,id=>{
    if(id.includes('shared/'))return loadShared(id.split('/').pop());
    if(id.startsWith('@/api/'))return api;
    if(id==='vuex')return {mapState:()=>({}),mapGetters:()=>({})};
    if(id.includes('validate'))return {Throttle:fn=>fn};
    if(id==='@/mixins/merchantDecoration')return {__esModule:true,default:load('template/uni-app/mixins/merchantDecoration.js')};
    if(id==='@/mixins/decorationProducts')return {__esModule:true,default:load('template/admin/src/mixins/decorationProducts.js')};
    if(id.includes('merchantTheme'))return {merchantPaletteStyle:p=>p?'theme:'+p.theme_color:''};
    return {};
  },uni,()=>pages,()=>({globalData:{}}));
  return mod.exports.default ? {...mod.exports.default,template} : mod.exports;
}
function state(options,props={}) {
  const vm={$t:x=>x,$util:{getWXStatusHeight:()=>({})},$config:{LIMIT:10},$store:{state:{app:{uid:0}}},$set:(o,k,v)=>o[k]=v,$nextTick:fn=>fn?Promise.resolve().then(fn):Promise.resolve(),...props};
  const apply=o=>{
    if(!o)return;
    (o.mixins||[]).forEach(apply);
    Object.entries(o.inject||{}).forEach(([key,value])=>{if(!(key in vm))vm[key]=typeof value.default==='function'?value.default():value.default;});
    Object.assign(vm,o.data?o.data.call(vm):{});
    Object.entries(o.methods||{}).forEach(([key,fn])=>vm[key]=fn.bind(vm));
    Object.entries(o.computed||{}).forEach(([key,fn])=>{if(typeof fn==='function')Object.defineProperty(vm,key,{get:()=>fn.call(vm),configurable:true});});
  };apply(options);return vm;
}
const tick=()=>new Promise(setImmediate);
test('shop navigation uses saved configuration and deletion cannot inherit platform menus',async()=>{
  const {scopedNavigation}=loadShared('decorationContext'),{navigationComponent}=loadShared('navigationComponent');
  const saved=navigationComponent();saved.menuList[1].name='本店分类';
  const configured=scopedNavigation(saved,7);
  assert.equal(configured.menuList[1].link,'/pages/merchant/category?id=7');
  assert.equal(saved.menuList[1].link,'/pages/goods_cate/goods_cate');
  let network=0;api.getNavigation=async()=>{network++;return{data:saved};};
  const vm=state(load('template/uni-app/components/pageFooter/index.vue'),{pageScoped:true,configData:configured});
  let shown;vm.setNavigationInfo=data=>shown=data;await vm.navigationInfo();
  assert.equal(shown.menuList[1].name,'本店分类');assert.equal(network,0);
  vm.configData={};await vm.navigationInfo();assert.deepEqual(shown,{});assert.equal(network,0);
  const hidden=scopedNavigation({...saved,isHide:true},7);assert.equal(loadShared('mainNavigation').navigationVisible(hidden,'/pages/merchant/category?id=7'),false);
});
test('H5 global dock follows page navigation, palette and explicit removal',()=>{
  const options=load('template/uni-app/components/storeNavigation/index.vue',{H5:true});
  const vm=state(options);vm.navigation=loadShared('navigationComponent').navigationComponent();vm.colorStyle='platform';
  vm.activePage={decorationNavigation:{},merchantStyle:'shop'};assert.deepEqual(vm.effectiveNavigation,{});assert.equal(vm.enabled,false);assert.equal(vm.navigationStyle,'platform;shop');
  vm.routePath='/pages/merchant/category';vm.activePage.decorationNavigation=loadShared('decorationContext').scopedNavigation(vm.navigation,7);assert.equal(vm.enabled,true);
});
test('preview survives shop/category/product navigation and stops on other shops or platform pages',()=>{
  load('template/uni-app/utils/installMerchantPreviewNavigation.js').installMerchantPreviewNavigation();
  pages=[{route:'pages/merchant/shop',options:{id:7,shop_page_id:42}}];
  const next={url:'/pages/merchant/category?id=7'};interceptors.navigateTo.invoke(next);assert.match(next.url,/shop_page_id=42/);
  pages=[{route:'pages/merchant/category',$page:{fullPath:next.url}}];
  const detail={url:'/pages/goods_details/index?id=9'};interceptors.navigateTo.invoke(detail);assert.match(detail.url,/preview_shop_id=7/);
  pages=[{route:'pages/goods_details/index',$page:{fullPath:detail.url}}];
  const home={url:'/pages/merchant/shop?id=7'};interceptors.redirectTo.invoke(home);assert.match(home.url,/shop_page_id=42/);
  for(const url of ['/pages/index/index','/pages/merchant/shop?id=8','/pages/merchant/products?shop_id=8']){const target={url};interceptors.navigateTo.invoke(target);assert.equal(target.url,url);}
  pages=[{route:'pages/index/index',options:{}}];const clean={url:'/pages/merchant/shop?id=7'};interceptors.navigateTo.invoke(clean);assert.equal(clean.url,'/pages/merchant/shop?id=7');
});
test('category and detail requests retain merchant preview ID',async()=>{
  const calls=[];api.getShop=async()=>({data:{id:7}});api.getMerchantTheme=async(...args)=>{calls.push(args);return{data:{page:{status:3},palette:{show_merchant_name:true}}};};
  const category=state(load('template/uni-app/pages/merchant/category.vue'));category.id=7;category.previewPageId=42;await category.load();assert.equal(calls[0][2].shop_page_id,42);
  api.getMerchantProductTheme=async(...args)=>{calls.push(args);return{data:{shop_id:7,page:{value:{}},palette:{show_merchant_name:true}}};};
  const detail=state(load('template/uni-app/pages/goods_details/index.vue'));detail.id=9;detail.merchantPreviewId=42;detail.merchantPreviewShop=7;await detail.getDiyData();
  assert.equal(calls[1][1].shop_page_id,42);assert.equal(calls[1][1].preview_shop_id,7);assert.equal(detail.merchantPalette.show_merchant_name,true);
});
test('merchant name uses reactive page policy with explicit component override',()=>{
  storage.showMerchantName=false;let scoped=true;
  const vm=state(load('template/uni-app/components/merchantName/index.vue'),{merchantDisplay:()=>scoped,show:undefined});
  assert.equal(vm.visible,true);scoped=false;assert.equal(vm.visible,false);vm.show=true;assert.equal(vm.visible,true);vm.show=false;scoped=true;assert.equal(vm.visible,false);
});
test('admin and APP generate identical product selection, ordering and shop scope',async()=>{
  const conf=load('template/admin/src/components/mobilePage/home_goods_list.vue').data.call({num:1}).defaultConfig;
  for(const type of [1,3,4])for(const sort of [0,1,2]){
    conf.typeConfig.activeValue=type;conf.goodsSort.tabVal=sort;conf.goodsList.list=[{id:2},{id:1}];conf.classList.classVal=[5];conf.goodsLabel.activeValue=[6];
    const captured=[];api.getProProduct=async query=>{captured.push(query);return{data:[{id:1},{id:2}]};};api.getProductslist=api.getProProduct;
    const admin=state(load('template/admin/src/mixins/decorationProducts.js'),{decorationPreview:()=>({shopId:7,requiresShop:true})});admin.refreshPreviewProducts(conf);await tick();
    const app=state(load('template/uni-app/subpackage/diyComponents/goodList.vue'),{dataConfig:conf,shopId:7,list:null});app.productslist();await tick();
    assert.deepEqual(captured[0],captured[1]);assert.deepEqual(admin.list,app.tempArr);
  }
});
test('changing preview shop clears stale products and empty shop never requests all merchants',async()=>{
  const conf=load('template/admin/src/components/mobilePage/home_goods_list.vue').data.call({num:1}).defaultConfig;conf.typeConfig.activeValue=3;
  let shopId=7;const pending=[];api.getProProduct=query=>new Promise(resolve=>pending.push({query,resolve}));
  const vm=state(load('template/admin/src/mixins/decorationProducts.js'),{decorationPreview:()=>({shopId,requiresShop:true})});vm.refreshPreviewProducts(conf);await tick();
  shopId=8;vm.refreshPreviewProducts(conf);await tick();pending[1].resolve({data:[{id:8}]});await tick();pending[0].resolve({data:[{id:7}]});await tick();assert.deepEqual(vm.list,[{id:8}]);
  shopId=0;vm.refreshPreviewProducts(conf);await tick();assert.equal(pending.length,2);assert.deepEqual(vm.list,[]);assert.match(vm.productPreviewMessage,/请选择/);
});

test('product tabs pass current shop into rendered product list',()=>{
  const Vue=require(path.join(root,'template/admin/node_modules/vue/dist/vue.common.js'));
  Vue.prototype.$config={LIMIT:10};
  const config=load('template/admin/src/components/mobilePage/home_product.vue').data.call({num:1}).defaultConfig;
  const options=load('template/uni-app/subpackage/diyComponents/promotionList.vue');
  options.props.shopId=options.props.shopId||{type:Number,default:0};
  const vm=new Vue({...options,propsData:{dataConfig:config,shopId:7},components:{goodList:{props:['dataConfig','shopId']},commonWrapper:{props:['config']}},...compiler.compileToFunctions(options.template)});
  const find=node=>{if(node.componentOptions&&node.componentOptions.tag==='goodList')return node;for(const child of [...(node.children||[]),...(node.componentOptions&&node.componentOptions.children||[])]){const hit=find(child);if(hit)return hit;}};
  assert.equal(find(vm._render()).componentOptions.propsData.shopId,7);
  vm.$destroy();
});

test('product tab editor uses fresh scoped products instead of saved product snapshots',async()=>{
  const options=load('template/admin/src/components/mobilePage/home_product.vue');
  const vm=state(options,{num:1,colorStyle:{theme:'#123456',gradient:'#456789'},decorationPreview:()=>({shopId:7,requiresShop:true})});
  const config=JSON.parse(JSON.stringify(vm.defaultConfig));
  config.tabConfig.list[0].tabVal=1;config.tabConfig.list[0].goodsList={list:[{id:2,store_name:'old title'}]};
  let query;api.getProProduct=async params=>{query=params;return{data:[{id:2,store_name:'current title'}]};};
  vm.setConfig(config);await tick();
  assert(query,'editor must query current products');assert.equal(query.seller_shop_id,7);assert.equal(query.ids,'2');assert.equal(vm.list[0].store_name,'current title');
});

test('switching product tabs applies the selected tab quantity',()=>{
  const config=load('template/admin/src/components/mobilePage/home_product.vue').data.call({num:1}).defaultConfig;
  const options=load('template/uni-app/subpackage/diyComponents/promotionList.vue'),vm=state(options,{dataConfig:config,shopId:7});
  const next=JSON.parse(JSON.stringify(config.tabConfig.list[0]));next.numConfig.val=2;next.tabVal=3;
  vm.changeTab(next);options.watch.activeValue.handler.call(vm,next);
  assert.equal(vm.goodDataConfig.numberConfig.val,2);
});

test('super component goods preview scopes its request and ignores stale replies',async()=>{
  const adminOptions=load('template/admin/src/components/mobilePage/home_custom_component.vue');
  const vm=state(adminOptions,{num:1,decorationPreview:()=>({shopId:7,requiresShop:true})});
  const config=JSON.parse(JSON.stringify(vm.defaultConfig));config.selectType.activeValue='goods';config.goodsDataSource.tabVal=0;config.goodsList.list=[{id:1}];vm.configObj=config;
  const pending=[];api.getThemeProduct=query=>new Promise(resolve=>pending.push({query,resolve}));
  vm.fetchGoodsList();assert.equal(pending[0].query.seller_shop_id,7);
  config.goodsList.list=[{id:2}];vm.fetchGoodsList();pending[1].resolve({data:[{id:2}]});await tick();pending[0].resolve({data:[{id:1}]});await tick();assert.deepEqual(vm.listData,[{id:2}]);
});

test('APP super component ignores an old selected-product response',async()=>{
  const defaults=load('template/admin/src/components/mobilePage/home_custom_component.vue').data.call({num:1}).defaultConfig;
  defaults.selectType.activeValue='goods';defaults.goodsDataSource.tabVal=0;defaults.goodsList.list=[{id:1}];
  const vm=state(load('template/uni-app/subpackage/diyComponents/customComponent.vue'),{dataConfig:defaults,shopId:7});
  const pending=[];api.getThemeProduct=query=>new Promise(resolve=>pending.push({query,resolve}));
  vm.fetchGoodsData();defaults.goodsList.list=[{id:2}];vm.fetchGoodsData();pending[1].resolve({data:[{id:2}]});await tick();pending[0].resolve({data:[{id:1}]});await tick();
  assert.deepEqual(vm.dataList,[{id:2}]);
});

test('platform detail shop preview derives the selected product merchant',async()=>{
  const config=loadShared('merchantDecoration').merchantComponent('shopInfo');config.showProducts=false;
  const vm=state(load('template/admin/src/mixins/merchantPreview.js'),{config,decorationPreview:()=>({shopId:0,requiresShop:false}),decorationProduct:()=>({storeInfo:{id:4,seller_shop_id:7}})});
  const calls=[];api.getStorefrontPreview=async query=>{calls.push(query);return{data:{id:7,name:'Actual shop'}};};
  await vm.refreshMerchantPreview();assert.equal(vm.previewShopId,7);assert.equal(vm.previewShop.name,'Actual shop');assert.equal(calls[0].shop_id,7);
});

test('invalid explicit merchant preview fails visibly instead of showing platform decoration',async()=>{
  let fallback=0;api.getMerchantProductTheme=async()=>{throw new Error('preview theme unavailable');};api.getThemeInfo=async()=>{fallback++;return {data:{value:{}}};};
  const vm=state(load('template/uni-app/pages/goods_details/index.vue'));vm.id=1;vm.merchantPreviewId=42;vm.merchantPreviewShop=7;
  await vm.getDiyData();assert.equal(vm.themeStatus,'error');assert.equal(fallback,0);
});

test('unmeasured product tab header keeps natural height when the product selection is empty',()=>{
  const Vue=require(path.join(root,'template/admin/node_modules/vue/dist/vue.common.js'));Vue.prototype.$config={LIMIT:10};
  const config=load('template/admin/src/components/mobilePage/home_product.vue').data.call({num:1}).defaultConfig;
  const options=load('template/uni-app/subpackage/diyComponents/promotionList.vue');
  const vm=new Vue({...options,propsData:{dataConfig:config,shopId:7},...compiler.compileToFunctions(options.template)});
  const find=node=>{if(node.data&&node.data.staticClass==='nav-bd-box')return node;for(const c of [...(node.children||[]),...(node.componentOptions&&node.componentOptions.children||[])]){const r=find(c);if(r)return r;}};
  assert.equal(find(vm._render()).data.style.height,'auto');vm.$destroy();
});

test('storefront decoration preview uses the existing authorized decoration read endpoint',()=>{
  const mod={exports:{}},requests=[];
  new Function('module','exports','require',transform(fs.readFileSync(path.join(root,'template/admin/src/api/diy.js'),'utf8')))(mod,mod.exports,id=>id==='@/libs/request'?request=>requests.push(request):{});
  mod.exports.getStorefrontPreview({kind:'shop',shop_id:7});
  assert.equal(requests[0].url,'diy_pro/get_product');assert.equal(requests[0].params.preview_kind,'shop');assert.equal(requests[0].params.shop_id,7);
});

test('product tabs without saved margins have room on all four sides',()=>{
  const options=load('template/admin/src/components/mobilePage/home_product.vue');
  const vm=state(options,{num:1,colorStyle:{theme:'#123456',gradient:'#456789'},decorationPreview:()=>({shopId:0,requiresShop:true})});
  const config=JSON.parse(JSON.stringify(vm.defaultConfig));delete config.marginConfig;config.mbConfig={val:7};
  vm.setConfig(config);
  const app=state(load('template/uni-app/subpackage/diyComponents/promotionList.vue'),{dataConfig:{...config,marginConfig:undefined},shopId:1});
  const {componentStyle}=loadShared('componentStyle');
  const adminStyle=componentStyle(config).inner,appStyle=componentStyle(app.configData,'rpx').inner;
  assert.equal(adminStyle.marginLeft,'10px');assert.equal(adminStyle.marginRight,'10px');assert.equal(adminStyle.marginTop,'7px');assert.equal(adminStyle.marginBottom,'10px');
  assert.equal(appStyle.marginLeft,'20rpx');assert.equal(appStyle.marginRight,'20rpx');assert.equal(appStyle.marginTop,'14rpx');assert.equal(appStyle.marginBottom,'20rpx');
  const custom={title:'外边距',isAll:true,valList:[{val:5},{val:16},{val:8},{val:16}]};
  const patched=load('template/admin/src/components/mobileConfig/c_home_product.vue').methods.patchConfig({marginConfig:custom});assert.deepEqual(patched.marginConfig,custom);
});

test('legacy flat product tab becomes a rounded spaced card while explicit new custom styles persist',()=>{
  const options=load('template/admin/src/components/mobilePage/home_product.vue'),config=options.data.call({num:1}).defaultConfig;
  delete config.cardStyleVersion;config.fillet.val=0;config.marginConfig={isAll:true,val:0,valList:[{val:0},{val:10},{val:0},{val:10}]};config.paddingConfig={isAll:false,val:0};
  const app=state(load('template/uni-app/subpackage/diyComponents/promotionList.vue'),{dataConfig:config,shopId:1});
  const style=loadShared('componentStyle').componentStyle(app.configData).inner;
  assert.equal(style.borderRadius,'12px');assert.equal(style.paddingLeft,'12px');assert.equal(style.paddingTop,'12px');assert.equal(style.marginTop,'10px');assert.equal(style.marginBottom,'10px');
  const customized={...config,cardStyleVersion:1,fillet:{type:0,val:0},paddingConfig:{val:4,isAll:false}};
  app.dataConfig=customized;assert.equal(loadShared('componentStyle').componentStyle(app.configData).inner.borderRadius,'0px');assert.equal(loadShared('componentStyle').componentStyle(app.configData).inner.paddingLeft,'4px');
});

test('product-tab singleton renders a full-width row while ordinary product grids retain their layout',()=>{
  const config=load('template/admin/src/components/mobilePage/home_goods_list.vue').data.call({num:1}).defaultConfig;config.styleConfig.tabVal=1;
  const vm=state(load('template/uni-app/subpackage/diyComponents/goodList.vue'),{dataConfig:config,compactSingle:true,list:null});vm.tempArr=[{id:1}];
  assert.equal(vm.styleConfig,0);vm.tempArr=[{id:1},{id:2}];assert.equal(vm.styleConfig,1);vm.compactSingle=false;vm.tempArr=[{id:1}];assert.equal(vm.styleConfig,1);
  vm.compactSingle=true;config.bntStyleConfig.tabVal=0;assert.equal(vm.btnStyle,1,'the selected plus icon stays a plus icon in the compact row');
});

test('product tab preview price follows current theme color',()=>{
  const options=load('template/admin/src/components/mobilePage/home_product.vue');
  const vm=state(options,{num:1,colorStyle:{theme:'#155EEF',gradient:'#5599ff'},decorationPreview:()=>({shopId:0,requiresShop:true})});
  const config=JSON.parse(JSON.stringify(vm.defaultConfig));config.toneCartConfig.tabVal=0;vm.setConfig(config);assert.equal(vm.goodsPriceColor,'#155EEF');
});
