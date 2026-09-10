const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {bundle,install} = require('./theme_component_harness.cjs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await install(page,bundle('template/admin/src/pages/setting/theme/editTheme/components/CartEditor.vue'));
    await page.waitForFunction(()=>!editor.loading);
    const settings=page.locator('.header-actions-settings');
    await settings.getByRole('button',{name:'添加按钮',exact:true}).first().click();
    const card=settings.locator('.button-card').first();
    await card.locator('.el-select').click();
    await page.locator('.el-select-dropdown:visible').getByText('页面跳转',{exact:true}).click();
    await card.getByPlaceholder('请选择商城页面').click();
    assert.equal(await page.evaluate(()=>document.querySelector('.header-actions-settings').__vue__.$refs.links.modals),true,'clicking the page input opens the page picker');
    await page.evaluate(()=>{document.querySelector('.header-actions-settings').__vue__.$refs.links.$emit('linkUrl','/pages/goods/goods_search/index');});
    assert.equal(await card.getByPlaceholder('请选择商城页面').inputValue(),'/pages/goods/goods_search/index');
    await card.locator('.el-select').click();
    await page.locator('.el-select-dropdown:visible').getByText('URL跳转',{exact:true}).click();
    const url='https://example.com/help?a=1&b=2#tips';
    await card.getByPlaceholder('请输入 http:// 或 https:// 网址').fill(url);
    await page.getByRole('button',{name:'保存购物车页',exact:true}).click();
    await page.waitForFunction(()=>saved.length===1);
    assert.equal(await page.evaluate(()=>saved[0].value.title_actions.left[0].link),url);
    assert.equal(await page.evaluate(()=>saved[0].value.title_actions.left[0].type),'url');
    await page.evaluate(()=>mountEditor());
    await page.waitForFunction(()=>!editor.loading);
    assert.equal(await page.getByPlaceholder('请输入 http:// 或 https:// 网址').inputValue(),url);
    console.log('PASS title destination editor: page-picker input, selected path, URL entry and save reload');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
