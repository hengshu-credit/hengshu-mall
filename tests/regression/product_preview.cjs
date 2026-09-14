const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {root,transform,compiler}=require('./theme_component_harness.cjs'),{loadShared}=require('./ranking_shared_loader.cjs');
const cleanup=require(path.join(root,'template/admin/node_modules/jsdom-global'))();global.DOMParser=window.DOMParser;
const Vue=require(path.join(root,'template/admin/node_modules/vue/dist/vue.common.js'));
function load(file){
 const source=fs.readFileSync(path.join(root,file),'utf8'),sfc=file.endsWith('.vue')?compiler.parseComponent(source):null,m={exports:{}};
 new Function('module','exports','require',transform(sfc?sfc.script.content:source))(m,m.exports,id=>{
  if(id==='vuex')return{mapState:()=>({})};
  if(id==='@/mixins/productPreview')return load('template/admin/src/mixins/productPreview.js');
  if(id==='@/utils/previewDescription')return load('template/admin/src/utils/previewDescription.js');
  if(id.includes('shared/'))return loadShared(id.split('/').pop());
  if(id.endsWith('.png'))return '/placeholder.png';
  return{};
 });return m.exports;
}
try{
 const detail={storeInfo:{id:1,store_name:'当前商品',image:'/current.png',slider_image:['/current.png'],price:'19.90',ot_price:'29.90',vip_price:0,is_vip:0,stock:5,sales:2,params_list:[{name:'品牌',value:'当前品牌'}],protection_list:[],description:'<section><p style="color:red">当前介绍</p><img src="/uploads/current.png" onerror="alert(1)"><script>bad()</script><iframe src="https://bad.test"></iframe></section>'},productValue:{default:{suk:'默认规格',image:'/current.png'}},replyCount:0,activity:[],good_list:[]};
 const vm=new Vue({...load('template/admin/src/mixins/productPreview.js').default,inject:undefined});vm.decorationProduct=()=>detail;
 assert.equal(vm.previewStore.store_name,'当前商品');assert.equal(vm.previewSpecs.length,1);assert.equal(vm.previewSlides.length,1);
 detail.productValue={};assert.equal(vm.$options.computed.previewSpecs.call({liveProductPreview:true,previewDetail:detail}).length,0,'products without a SKU strip must not gain an invented choice');
 const options=load('template/admin/src/components/mobilePage/home_product_service.vue').default;
 const service={previewStore:detail.storeInfo,previewDetail:detail};
 assert.equal(options.computed.parameterSummary.call(service),'当前品牌');assert.equal(options.computed.protectionSummary.call(service),'');assert.deepEqual(options.computed.previewActivities.call(service),[]);
 const cleaned=load('template/admin/src/utils/previewDescription.js').previewDescription(detail.storeInfo.description);
 assert(cleaned.includes('/uploads/current.png'));assert(cleaned.includes('当前介绍'));assert(cleaned.includes('color: red'));assert(!/onerror|script|iframe|bad\(\)/i.test(cleaned));
 const image=document.createElement('div');image.innerHTML=cleaned;assert.equal(image.querySelector('img').style.width,'100%');
 for(const name of ['home_product_info','home_product_desc','home_product_service','home_reviews','home_paid_vip']){
  const source=fs.readFileSync(path.join(root,'template/admin/src/components/mobilePage/'+name+'.vue'),'utf8');
  assert.deepEqual(compiler.compile(compiler.parseComponent(source).template.content).errors,[],name);
 }
 console.log('PASS current product previews: live title/price/SKU count, empty services, nested description images, inactive content and sanitized markup');
}finally{cleanup();}
