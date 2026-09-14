const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {bundle,root}=require('./theme_component_harness.cjs');
const {loadShared}=require('./ranking_shared_loader.cjs');
module.exports=async function verifyPresentation(browser){
  const compiled=bundle('template/admin/src/components/merchantDecoration/Preview.vue',['template/admin/src/components/merchantDecoration/Settings.vue'],['@/components/mobileConfigRight/c_set_up','@/components/mobileConfigRight/c_common_style','@/components/mobileConfigRight/c_upload_img','@/components/merchantSelect','@/components/themeActions/RankingFields','@/components/linkaddress']);
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const shop=JSON.parse(fs.readFileSync(path.join(root,'.build/storefront-audit/live/shop1.json'),'utf8')).data;
  try{
    await page.setContent('<div id="presentation"></div>');
    for(const file of ['vue/dist/vue.js','element-ui/lib/index.js'])await page.addScriptTag({path:path.join(root,'template/admin/node_modules',file)});
    await page.addStyleTag({path:path.join(root,'template/admin/node_modules/element-ui/lib/theme-chalk/index.css')});
    await page.addStyleTag({content:compiled.css+'*{box-sizing:border-box}body{font-family:Arial,"Microsoft YaHei",sans-serif}.preview-column{width:320px;--view-theme:#ff4081;--view-minorColorT:#fff0f5}.panel{width:320px;margin-left:30px}.presentation-layout{display:flex;padding:20px}'});
    await page.evaluate(({compiled,config,shop})=>{
      Vue.prototype.$route={query:{type:'shop'}};
      const cache={};function load(id){if(cache[id])return cache[id].exports;const record=compiled.records[id],mod=cache[id]={exports:{}};
        new Function('module','exports','require',record.code)(mod,mod.exports,name=>{
          if(record.dependencies[name])return load(record.dependencies[name]);
          if(name==='@/api/diy')return {getStorefrontPreview:async q=>({data:q.kind==='shop'?shop:q.kind==='follow'?{follower_count:1}:{list:[]}}),getCategory:async()=>({data:[]})};
          if(/\.(png|jpg)$/.test(name))return '';
          return {default:{template:'<div />'},__esModule:true};
        });if(record.template){Object.assign(mod.exports.default,Vue.compile(record.template));mod.exports.default._scopeId=record.scope;}return mod.exports;}
      const settings=Object.keys(compiled.records).find(p=>p.endsWith('/merchantDecoration/Settings.vue'));
      window.presentation=new Vue({data:{config,scope:{shopId:1},visible:true},provide(){return {decorationPreview:()=>this.scope};},components:{Preview:load(compiled.main).default,Settings:load(settings).default},template:'<div class="presentation-layout"><div class="preview-column"><preview v-if="visible" :config="config" :color-style="{theme:\'#ff4081\'}" /></div><div class="panel"><settings :config="config" /></div></div>'}).$mount('#presentation');
    },{compiled,config:loadShared('merchantDecoration').merchantComponent('shopHeader'),shop});
    await page.locator('.shop-header-profile .shop-name').waitFor();
    for(const [label,layout]of [['左右布局',0],['居中布局',1],['反向布局',2]]){
      await page.getByText(label,{exact:true}).click();
      const config=await page.evaluate(()=>presentation.config);assert.equal(config.headerLayout,layout);
      const body=JSON.stringify({type:'home',value:{value:{header:config}}});
      const validated=JSON.parse(cp.execFileSync(path.join(root,'.build/php74/php.exe'),['-c',path.join(root,'.build/commerce-hardening-20260914/php-audit.ini'),path.join(__dirname,'decoration_sync_save.php')],{cwd:root,input:body,encoding:'utf8',windowsHide:true}));
      await page.evaluate(async saved=>{presentation.visible=false;await Vue.nextTick();presentation.config=saved.value.header;presentation.visible=true;},validated);
      await page.locator('.shop-header-profile.layout-'+layout).waitFor();
      const actual=await page.locator('.shop-header-profile').evaluate(el=>({direction:getComputedStyle(el).flexDirection,text:el.textContent}));
      assert.equal(actual.direction,['row','column','row-reverse'][layout]);assert(actual.text.includes('关注店铺'));
    }
    const followSwitch=page.locator('.el-form-item').filter({has:page.locator('label',{hasText:/^关注按钮$/})}).locator('.el-switch');
    await followSwitch.click();assert.equal(await page.locator('.shop-header-profile .shop-follow-control').count(),0);
    await followSwitch.click();await page.locator('.shop-header-profile .shop-follow-control').waitFor();
    await page.getByText('左右布局',{exact:true}).click();
    await page.screenshot({path:path.join(root,'.build/commerce-hardening-20260914/admin-shop-presentation.png')});
    assert.deepEqual(errors,[]);console.log('PASS: actual merchant header controls, PHP save/reload, three layouts and follow visibility');
  }finally{await page.close();}
};
