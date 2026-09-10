const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {root,transform,compiler}=require('./theme_component_harness.cjs');
const {preprocess}=require(path.join(root,'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
const script=compiler.parseComponent(fs.readFileSync(path.join(root,'template/uni-app/pages/goods_cate/goods_cate.vue'),'utf8')).script.content;
(async()=>{
  for(const platform of [{APP_PLUS:true},{H5:true}]){
    const native=!!platform.APP_PLUS,calls=[],module={exports:{}};
    const config={status:2,page_title:'自定义分类标题',show_title:1,title_hidden:0,title_text_color:'#000000',title_background_color:'#FFFFFF'};
    vm.runInNewContext(transform(preprocess(script,platform,{type:'js'})),{module,exports:module.exports,
      uni:{getStorageSync(){return 0;},setStorageSync(){},hideTabBar(){},getWindowInfo(){return {statusBarHeight:24};},setNavigationBarTitle(){calls.push('native-title');},setNavigationBarColor(){calls.push('native-color');}},
      plus:{navigator:{setStatusBarStyle(value){calls.push(value);}}},
      require(name){if(name==='vuex')return {mapGetters(){return {};}};if(name.includes('categoryPageConfig'))return {normalizeCategoryPage:value=>value};if(name==='@/api/api.js')return {getThemeInfo:async()=>({data:config})};return {};},
    });
    const options=module.exports.default,ctx={_categoryRefreshId:1,statusBarHeight:0,readCategoryTarget(){},$t:v=>v,$nextTick:fn=>fn(),categoryDecoration:config};
    options.onLoad.call(ctx,{});await options.methods.classStyle.call(ctx,1);
    assert.deepEqual(calls,native?['dark']:['native-title','native-color'],'custom native title must not recreate the system title bar');
    ctx.titleVisible=options.computed.titleVisible.call(ctx);
    assert.equal(options.computed.titleHeight.call(ctx),native?68:44);
    config.show_title=0;ctx.titleVisible=options.computed.titleVisible.call(ctx);
    assert.equal(options.computed.titleHeight.call(ctx),native?24:0,'deleted title leaves only the native status bar');
  }
  console.log('PASS category custom title: native status bar colors, no duplicate system title, deletion clears title space');
})().catch(e=>{console.error(e);process.exitCode=1;});
