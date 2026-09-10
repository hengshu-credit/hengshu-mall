const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, transform, compiler } = require('./theme_component_harness.cjs');
const { preprocess } = require(path.join(root, 'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
const tasks = [], writes = [], messages = [];
let loading = 0;
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const api = { getAttr() {const task=deferred();tasks.push(task);return task.promise;}, postCartNum(body) {const task=deferred();writes.push({body,...task});return task.promise;}, postCartAdd(body) {const task=deferred();writes.push({body,...task});return task.promise;} };
function component(file) {
  const source=compiler.parseComponent(fs.readFileSync(path.join(root,'template/uni-app',file),'utf8')).script.content;
  const m={exports:{}};
  new Function('module','exports','require','uni','getApp',transform(preprocess(source,{H5:true},{type:'js'})))(m,m.exports,
    id=>id==='vuex'?{mapGetters:()=>({})}:id==='@/api/store.js'?api:{},
    {showLoading(){loading++;},hideLoading(){loading--;},getStorageSync(){},getWindowInfo(){return {};},getSystemInfo(){return {};},navigateTo(){}},()=>({globalData:{}}));
  return m.exports.default;
}
function context(options) {return {...options.methods, $t:v=>v,$set:(obj,key,value)=>obj[key]=value,$util:{Tips:message=>messages.push(message)},$refs:{d_goodClass:{}},isLogin:true,attr:{cartAttr:false,productAttr:[],productSelect:{}},storeInfo:{},cartData:{iScart:false,cartList:[]},tempArr:[],getCartNum(){},getCartList(){},};}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
(async()=>{
  const list=component('components/categoryProductList/index.vue');
  for(const spec_type of [0,1,'0','1']) {
    const events=[],vm={...list.methods,$emit:(...args)=>events.push(args)};
    list.methods.buy.call(vm,{id:1,stock:10,cart_button:1,is_virtual:'0',spec_type},0);
    assert.equal(events[0][0],'gocartduo','Every ordinary product opens SKU selection before adding');
  }
  for(const extra of [{cart_button:0},{cart_button:'0'},{is_virtual:1},{activity:{type:'1'}}]) {
    const events=[],vm={...list.methods,$emit:(...args)=>events.push(args)};
    list.methods.buy.call(vm,{id:1,stock:10,cart_button:1,...extra},0);
    assert.equal(events[0][0],'detail','Special products retain their dedicated checkout rules');
  }
  const bottom=component('subpackage/diyComponents/productBottom.vue');
  assert.equal(bottom.computed.showCartButton.call({bottomConfig:{cartButton:{tabVal:'0'}}}),true,'Serialized visible tab is accepted');
  assert.equal(bottom.computed.isCartButtonVisible.call({storeInfo:{cart_button:'0'},showCartButton:true}),false,'Serialized disabled permission stays disabled');
  for(const file of ['pages/goods_cate/goods_cate2.vue','pages/goods_cate/goods_cate3.vue']) {
    const vm=context(component(file));
    const item={id:1,store_name:'商品',cart_button:1};
    vm.goCartDuo(item);vm.goCartDuo(item);
    assert.equal(tasks.length,1,'Repeated taps share one SKU request');
    assert.equal(vm.attr.cartAttr,false,'Previous SKU data is not opened while loading');
    tasks.shift().reject('加载失败');await flush();
    assert.equal(loading,0,'Failed SKU reads clear loading');assert.equal(vm.attrLoading,false);
    vm.goCartDuo(item);
    tasks.shift().resolve({data:{productAttr:[],productValue:{},storeInfo:{id:1,stock:10,min_qty:1,price:12,unique:'sku-1'}}});await flush();
    assert.equal(vm.attr.cartAttr,true);assert.equal(vm.attr.productSelect.unique,'sku-1');
    vm.goCatNum();vm.goCatNum();assert.equal(writes.length,1,'Repeated confirmation creates one cart write');
    assert.equal(writes[0].body.unique,'sku-1');assert.equal(writes[0].body.num,1);
    writes.shift().reject('加购失败');await flush();assert.equal(vm.cartSubmitting,false);assert.equal(vm.attr.cartAttr,true,'Failed confirmation retains selected SKU');
    vm.goCatNum();writes.shift().resolve({data:{}});await flush();assert.equal(vm.attr.cartAttr,false);
  }
  const vm=context(component('pages/goods_details/index.vue'));
  Object.assign(vm,{id:1,storeInfo:{cart_button:1},attrValue:'默认',productValue:{默认:{stock:10}},isOpen:false,attr:{cartAttr:false,productAttr:[{}],productSelect:{stock:10,cart_num:1,unique:'sku-1'}}});
  vm.goCat();assert.equal(vm.attr.cartAttr,true);assert.equal(writes.length,0);
  vm.goCat();vm.goCat();assert.equal(writes.length,1,'Detail confirmation is protected against repeated submission');
  assert.equal(writes[0].body.new,0,'Add-to-cart confirmation persists in the ordinary cart');
  writes.shift().reject('加购失败');await flush();assert.equal(vm.cartSubmitting,false);assert.equal(vm.attr.cartAttr,true);
  vm.isOpen=false;vm.attr.cartAttr=false;
  vm.goCat(true);assert.equal(vm.pendingBuy,true);assert.equal(writes.length,0);
  vm.confirmPurchase();assert.equal(writes.length,1);assert.equal(writes[0].body.new,1,'Buy-now confirmation keeps its checkout intent');
  writes.shift().reject('购买失败');await flush();
  vm.storeInfo.cart_button=0;vm.joinCart();assert.equal(writes.length,0,'Hidden add-to-cart restrictions also apply to the handler');
  console.log('PASS shopping interactions: ordinary SKU selection, special-product restrictions, flag types, loading cleanup, retry and duplicate-write protection');
})().catch(error=>{console.error(error);process.exitCode=1;});
