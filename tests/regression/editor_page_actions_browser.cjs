const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
const {bundle,install,root}=require('./theme_component_harness.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const type of ['Category','Cart']){
 const page=await browser.newPage({viewport:{width:1280,height:960}}),errors=[]; page.on('pageerror',error=>errors.push(error.message));
 await install(page,bundle(`template/admin/src/pages/setting/theme/editTheme/components/${type}Editor.vue`));
 await page.addStyleTag({content:'.category-editor,.cart-editor{width:1160px;margin-left:120px}'});
 await page.waitForFunction(()=>!editor.loading); await page.locator('.el-loading-mask').waitFor({state:'hidden'});
 assert.equal(await page.locator('.page-editor-actions > button').count(),4,`${type}: page toolbar must expose all four operations`);
 for(const button of await page.locator('.page-editor-actions > button').all()){const box=await button.boundingBox();assert.ok(box.x>=120 && box.x+box.width<=1280,`${type}: toolbar button inside actual editor viewport`);}
 for(const label of await page.locator('.editor-module-frame .module-name').all()) {
  const visible=await label.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;});
  assert.equal(visible,true,`${type}: module label must be visible and clickable`);
 }
 assert.equal(await page.locator('.editor-module-frame').count(),type==='Category'?3:4,'all preview modules use shared frame');
 const typeKey=type.toLowerCase();
 await page.locator('.page-editor-actions').getByRole('button',{name:'页面设置',exact:true}).click();
 assert.equal(await page.evaluate(()=>editor.panel),'page');
 if(type==='Category') await page.locator('.module-grid button').filter({hasText:'页面标题'}).click();
 const sides=page.locator('.header-actions-settings section');
 await sides.nth(0).getByRole('button',{name:'添加按钮'}).click();
 await sides.nth(0).getByPlaceholder('按钮名称').fill('我的首页');
 await sides.nth(0).getByText('显示文字',{exact:true}).click();
 if(type==='Category'){
  await page.getByRole('tab',{name:'样式设置',exact:true}).click();
  await page.locator('.el-form-item').filter({hasText:'标题背景颜色'}).locator('.el-color-picker').evaluate(el=>{el.__vue__.$emit('change','#123456');});
  assert.equal(await page.locator('.canvas-page-title').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(18, 52, 86)');
  assert.equal(await page.evaluate(()=>editor.config.title_actions.left[0].label),'我的首页');
 }
 await page.getByRole('button',{name:type==='Category'?'保存分类页':'保存购物车页',exact:true}).click();
 await page.waitForFunction(()=>saved.length===1);
 assert.equal(await page.evaluate(()=>saved[0].value.title_actions.left[0].label),'我的首页');
 await page.evaluate(()=>mountEditor()); await page.waitForFunction(()=>!editor.loading);
 assert.equal(await page.evaluate(()=>editor.config.title_actions.left[0].label),'我的首页');
 // Save-as writes a new theme with the current page type and keeps the source dirty state.
 await page.evaluate(()=>{editor.config.page_title='另存标题';});
 await page.locator('.page-editor-actions').getByRole('button',{name:'另存模板',exact:true}).click();
 await page.getByPlaceholder('请输入模板名称').fill('回归模板');
 await page.getByRole('button',{name:'保存模板',exact:true}).click();
 await page.waitForFunction(()=>saved.length===2);
 assert.equal(await page.evaluate(()=>saved[1].type),typeKey);
 assert.equal(await page.evaluate(()=>saved[1].tid),42);
 assert.equal(await page.evaluate(()=>saved[1].title),'回归模板');
 assert.equal(await page.evaluate(()=>dirty),true);
 await page.locator('.page-editor-actions').getByRole('button',{name:'重置',exact:true}).click();
 await page.locator('.el-message-box').getByRole('button',{name:'确定',exact:true}).click();
 await page.waitForFunction(()=>!editor.loading && editor.config.page_title!=='另存标题');
 assert.equal(await page.evaluate(()=>editor.config.title_actions.left[0].label),'我的首页');
 await page.locator('.el-loading-mask').waitFor({state:'hidden'});
 const title=await page.locator('.page-title-preview').boundingBox(),text=await page.locator('.page-title-text').boundingBox();
 assert.ok(Math.abs(title.x+title.width/2-text.x-text.width/2)<1,'title centered with asymmetric actions');
 await page.locator('.page-editor-actions').getByRole('button',{name:'保存为封面',exact:true}).click();
 await page.waitForFunction(()=>covers.length===1);
 assert.equal(await page.evaluate(()=>covers[0].type),typeKey);
 assert.equal(await page.evaluate(()=>covers[0].id),42);
 assert.ok(await page.evaluate(()=>uploads[0].size)>0,'real screenshot blob uploaded');
 await page.waitForFunction(()=>!editor.$children.find(child=>child.$options.props && child.$options.props.pageType)?.busy);
 await page.evaluate(()=>window.failCover=true);
 await page.locator('.page-editor-actions').getByRole('button',{name:'保存为封面',exact:true}).click();
 await page.getByText('模拟封面保存失败',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>covers.length),1,'failed cover API does not claim persisted cover');
 await page.evaluate(()=>{window.failCover=false;editor.$message.closeAll(); if(editor.$options.name==='CategoryEditor')editor.selectModule('checkout');editor.selectModule('navigation');});
 await page.locator('.el-message').first().waitFor({state:'hidden'});
 const dockFrames=await page.locator(type==='Category'?'.category-canvas-page > .editor-module-frame':'.cart-preview > .editor-module-frame').evaluateAll(els=>els.map(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom})));
 for(let i=1;i<dockFrames.length;i++)assert.ok(dockFrames[i].top>=dockFrames[i-1].bottom,'docked components do not overlap');
 await page.locator('.el-loading-mask').waitFor({state:'hidden'});
 fs.mkdirSync(path.join(root,'.build/theme-consistency/screenshots'),{recursive:true});
 await page.screenshot({path:path.join(root,`.build/theme-consistency/screenshots/${typeKey}-page-actions.png`)});
 assert.deepEqual(errors,[]);
 await page.close();
}
console.log('PASS editor page controls and visible module labels');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
