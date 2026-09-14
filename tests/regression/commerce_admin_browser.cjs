const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');const {bundle,root}=require('./theme_component_harness.cjs');
const compiled=bundle('template/admin/src/pages/product/productAdd/components/QualityReview.vue',['template/admin/src/pages/finance/commerce/index.vue'],['@/libs/request']);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1100,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.setContent('<div id="app"></div>');for(const file of ['vue/dist/vue.js','element-ui/lib/index.js'])await page.addScriptTag({path:path.join(root,'template/admin/node_modules',file)});
  await page.addStyleTag({path:path.join(root,'template/admin/node_modules/element-ui/lib/theme-chalk/index.css')});await page.addStyleTag({content:compiled.css});
  await page.evaluate(compiled=>{
   const cache={};const load=id=>{if(cache[id])return cache[id].exports;const record=compiled.records[id],module=cache[id]={exports:{}};
    new Function('module','exports','require',record.code)(module,module.exports,name=>{
     if(name==='@/libs/request')return {__esModule:true,default:async({url})=>({data:url.endsWith('/health')?{checked_at:1700000000,alerts:['任务重试已终止，需人工核对'],refund_unknown:1,queue:{available:true,size:1500}}:{count:1,list:url.endsWith('/refunds')?[{id:2,recharge_id:4,refund_no:'test-refund',state:'unknown',principal:'50.00',last_error:'等待渠道确认'}]:[{id:1,kind:'member',business_id:3,step:'order',state:'dead',attempts:10,last_error:'发送失败'}]}})};
     return load(record.dependencies[name]);
    });if(record.template)Object.assign(module.exports.default,Vue.compile(record.template));return module.exports;};
   const health=Object.keys(compiled.records).find(key=>key.endsWith('/finance/commerce/index.vue'));
   window.vm=new Vue({components:{Quality:load(compiled.main).default,Health:load(health).default},data:{review:{},monitor:false},template:'<div><el-form v-if="!monitor" :model="review" label-width="180px"><quality v-model="review" /></el-form><health v-else /></div>'}).$mount('#app');
  },compiled);
  for(const label of ['来源说明','发货地（实体商品）','销售主体','售后主体','服务承诺','促销素材核对说明'])await page.locator('.el-form-item').filter({has:page.locator('label',{hasText:label})}).first().locator('input').fill('核对记录：'+label);
  for(const label of ['售价','划线价依据','图片和促销条件','规格','可售库存','运费和发货地','销售及售后主体','服务承诺'])await page.locator('.el-checkbox').filter({hasText:new RegExp('^'+label+'$')}).click();
  await page.getByText('以上内容符合本店实际情况，保存时记录本次审核',{exact:true}).click();
  const review=await page.evaluate(()=>vm.review);assert.equal(review.confirm,true);assert.equal(review.checks.length,8);assert(review.after_sales_subject);assert.equal(review.reviewer_id,undefined);
  await page.screenshot({path:path.join(root,'.build/commerce-hardening-20260914/admin-quality.png')});
  await page.evaluate(()=>vm.monitor=true);await page.getByText('需人工处理',{exact:true}).waitFor();
  await page.getByText('充值退款',{exact:true}).click();await page.getByText('渠道待确认',{exact:true}).waitFor();await page.getByText('50.00',{exact:true}).waitFor();
  await page.screenshot({path:path.join(root,'.build/commerce-hardening-20260914/admin-health.png')});assert.deepEqual(errors,[]);
  console.log('PASS: real quality checklist controls emit complete review input; monitor shows terminal task and unknown refund states');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
