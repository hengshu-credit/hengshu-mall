const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { bundle, install, root } = require('./theme_component_harness.cjs');
(async () => {
  const compiled = bundle('template/admin/src/pages/setting/theme/editTheme/components/CategoryEditor.vue');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 960 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await install(page, compiled);
    await page.waitForFunction(() => !editor.loading);
    assert.equal(await page.locator('.module-grid button').count(), 8);
    assert.equal(await page.locator('.category-canvas-page').evaluate(el => getComputedStyle(el).borderRadius), '0px');
    for (const status of [1, 2, 3]) {
      await page.locator('.module-grid button').nth(status).click();
      assert.equal(await page.evaluate(() => editor.config.status), status);
      if (status === 1) await page.getByText('4列', { exact: true }).click();
      else {
        await page.getByText('双列网格', { exact: true }).click();
        assert.equal(await page.locator('.products').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2);
        await page.getByText('加粗体', { exact: true }).click();
        assert.equal(await page.locator('.product-info').first().evaluate(el => getComputedStyle(el).fontWeight), '700');
      }
      await page.getByRole('button', { name: '保存分类页' }).click();
      await page.waitForFunction(count => saved.length === count, status);
    }
    await page.locator('.module-grid button').nth(1).click();
    assert.equal(await page.evaluate(() => editor.config.columns), 4, 'layout settings restored');
    await page.getByRole('tab', { name: '样式设置' }).click();
    const padding = page.locator('.margin-style-config').filter({ hasText: '内边距' }).locator('input').first();
    await padding.fill('12'); await padding.press('Enter');
    await page.waitForFunction(() => editor.config.category_style.paddingConfig.val === 12);
    assert.equal(await page.locator('.canvas-module.selected > div').first().evaluate(el => getComputedStyle(el).paddingTop), '12px');
    await page.locator('.module-grid button').nth(0).click();
    await page.getByRole('button', { name: '删除顶部搜索栏' }).click();
    assert.equal(await page.locator('.canvas-module .search').count(), 0);
    await page.locator('.module-grid button').nth(0).click();
    assert.equal(await page.locator('.canvas-module .search').count(), 1);
    await page.locator('.module-grid button').nth(4).click();
    await page.locator('.navigation-label input').fill('分类导航');
    const menuInputs = page.locator('.navigation-settings .box-item input');
    await menuInputs.nth(0).fill('精选');
    await menuInputs.nth(1).fill('/pages/index/index?scene=category');
    await page.getByRole('tab', { name: '样式设置' }).click();
    assert.equal(await page.locator('.navigation-settings .margin-style-config').count(), 3);
    await page.locator('.navigation-settings .margin-style-config').filter({ hasText: '外边距' }).locator('input').first().fill('8');
    await page.locator('.navigation-settings .margin-style-config').filter({ hasText: '外边距' }).locator('input').first().press('Enter');
    await page.getByRole('button', { name: '保存分类页' }).click();
    await page.waitForFunction(() => saved.length === 4);
    assert.equal(await page.evaluate(() => saved.at(-1).value.navigation.mainNavigation.title), '分类导航');
    await page.evaluate(() => mountEditor()); await page.waitForFunction(() => !editor.loading);
    assert.equal(await page.evaluate(() => editor.config.navigation.menuList[0].link), '/pages/index/index?scene=category');
    assert.equal(await page.evaluate(() => editor.config.category_style.paddingConfig.val), 12);
    await page.locator('.module-grid button').nth(4).click();
    fs.mkdirSync(path.join(root, '.build/theme-components/screenshots'), { recursive: true });
    await page.screenshot({ path: path.join(root, '.build/theme-components/screenshots/category-navigation.png') });
    await page.getByRole('button', { name: '删除导航栏' }).click();
    await page.evaluate(() => window.failSave = true);
    await page.getByRole('button', { name: '保存分类页' }).click();
    await page.waitForFunction(() => !editor.saving);
    assert.equal(await page.evaluate(() => dirty), true);
    await page.evaluate(() => window.failSave = false);
    await page.getByRole('button', { name: '保存分类页' }).click();
    await page.waitForFunction(() => saved.length === 5);
    await page.evaluate(() => mountEditor()); await page.waitForFunction(() => !editor.loading);
    assert.equal(await page.evaluate(() => editor.hasNavigation), false);
    await page.locator('.module-grid button').nth(0).click();
    const sides = page.locator('.header-actions-settings section');
    await sides.nth(0).getByRole('button', {name:'添加按钮'}).click();
    await sides.nth(1).getByRole('button', {name:'添加按钮'}).click();
    await sides.nth(0).getByPlaceholder('按钮名称').fill('回首页');
    await sides.nth(0).getByText('显示文字',{exact:true}).click();
    await page.locator('.module-grid button').nth(5).click();
    await page.locator('.checkout-settings .el-form-item').filter({hasText:'按钮文字'}).locator('input').fill('立即结算');
    await page.locator('.checkout-settings .el-form-item').filter({hasText:'显示金额'}).locator('.el-switch').click();
    assert.equal(await page.locator('.checkout-preview .checkout-amount').count(),0);
    assert.equal(await page.locator('.checkout-preview b').innerText(),'立即结算');
    await page.locator('.module-grid button').nth(4).click();
    await page.getByText('智能隐藏',{exact:true}).click();
    await page.getByRole('button', {name:'保存分类页'}).click();
    await page.waitForFunction(()=>saved.length===6);
    await page.evaluate(()=>mountEditor()); await page.waitForFunction(()=>!editor.loading);
    assert.equal(await page.evaluate(()=>editor.config.search_actions.left[0].label),'回首页');
    assert.equal(await page.evaluate(()=>editor.config.search_actions.right[0].type),'share');
    assert.equal(await page.evaluate(()=>editor.config.checkout.buttonText),'立即结算');
    assert.equal(await page.evaluate(()=>editor.config.navigation.scrollMode),'smart');
    for(const index of [2,3,1]) { await page.locator('.module-grid button').nth(index).click(); assert.equal(await page.locator('.checkout-preview b').innerText(),'立即结算'); }
    const dock = await page.locator('.checkout-preview').boundingBox();
    await page.locator('.category-canvas-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    assert.equal((await page.locator('.checkout-preview').boundingBox()).y,dock.y,'checkout remains docked while canvas scrolls');
    fs.mkdirSync(path.join(root,'.build/page-actions/screenshots'),{recursive:true});
    await page.screenshot({path:path.join(root,'.build/page-actions/screenshots/category-components.png')});
    await page.locator('.module-grid button').nth(5).click();
    await page.getByRole('button',{name:'删除分类结算栏'}).click();
    await page.getByRole('button',{name:'保存分类页'}).click();await page.waitForFunction(()=>saved.length===7);
    await page.evaluate(()=>mountEditor());await page.waitForFunction(()=>!editor.loading);
    assert.equal(await page.locator('.checkout-preview').count(),0,'deleted checkout is not restored on reload');
    assert.deepEqual(errors, []);
    console.log('PASS category editor: eight modules, three layouts, fixed docks, header/checkout/navigation roundtrip and deletion, common styles and failed-save protection');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });


