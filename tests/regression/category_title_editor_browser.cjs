const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {bundle,install}=require('./theme_component_harness.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(5000);
  await install(page,bundle('template/admin/src/pages/setting/theme/editTheme/components/CategoryEditor.vue'));
  await page.waitForFunction(()=>!editor.loading);
  await page.locator('.canvas-page-title').click();
  await page.locator('.el-form-item').filter({hasText:'标题文字'}).locator('input').fill('精选分类');
  assert.equal(await page.locator('.canvas-page-title').innerText(),'精选分类');
  assert.equal(await page.locator('.canvas-module.selected .module-name').innerText(),'页面标题');
  assert.equal(await page.locator('.canvas-module.selected .module-tools').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(21, 94, 239)');
  const scroll=page.locator('.category-canvas-scroll');
  assert.equal(await scroll.evaluate(el=>getComputedStyle(el).scrollbarWidth),'none');
  assert(await scroll.evaluate(el=>el.scrollWidth<=el.clientWidth),'preview must not have horizontal overflow');
  await page.getByRole('button',{name:'删除页面标题',exact:true}).click();
  assert.equal(await page.locator('.canvas-page-title').count(),0);
  await page.getByRole('button',{name:'保存分类页',exact:true}).click();
  await page.evaluate(()=>mountEditor());await page.waitForFunction(()=>!editor.loading);
  assert.equal(await page.locator('.canvas-page-title').count(),0,'deleted title stays deleted');
  await page.locator('.module-grid button').filter({hasText:'页面标题'}).click();
  assert.equal(await page.locator('.canvas-page-title').innerText(),'精选分类','re-adding preserves its text');
  await page.getByRole('button',{name:'隐藏页面标题',exact:true}).click();
  assert.equal(await page.locator('.canvas-title-module.hidden').count(),1);
  await page.getByRole('button',{name:'显示页面标题',exact:true}).click();
  await page.locator('.module-grid button').filter({hasText:'分类组件3'}).click();
  assert.equal(await page.locator('.canvas-page-title').innerText(),'精选分类','layout changes preserve title settings');
  assert.deepEqual(errors,[]);console.log('PASS category title: select, rename, hide, delete/reload, re-add, consistent chrome and scrollbar-free preview');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
