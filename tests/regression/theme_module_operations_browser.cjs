const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { bundle, install } = require('./theme_component_harness.cjs');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const type of ['Category', 'Cart']) {
      const page = await browser.newPage({ viewport: { width: 1500, height: 960 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await install(page, bundle(`template/admin/src/pages/setting/theme/editTheme/components/${type}Editor.vue`));
      await page.waitForFunction(() => !editor.loading);
      const category = type === 'Category', label = category ? '搜索框' : '服务保障';
      const library = page.locator(category ? '.module-grid' : '.cart-library');
      assert.equal(await library.getByRole('button', { name: '页面设置', exact: true }).count(), 0);
      const frames = page.locator((category ? '.category-canvas-scroll' : '.cart-preview-scroll') + ' > .editor-module-frame');
      await frames.first().locator('.module-name').click();
      assert.equal(await frames.first().locator('.module-tools button').count(), 5);
      await page.getByRole('button', { name: '复制' + label, exact: true }).first().click();
      assert.equal(await frames.count(), 3);
      const copyId = await page.evaluate(() => editor.selectedContent);
      await page.evaluate(category => {
        if (category) editor.selectedSearch.tipConfig.value = '独立搜索内容';
        else editor.selectedService.service_labels[0] = '独立服务文案';
      }, category);
      await page.waitForFunction(category => category ? editor.selectedSearch.tipConfig.value === '独立搜索内容' : editor.selectedService.service_labels[0] === '独立服务文案', category);
      assert.equal(await page.evaluate(category => category ? editor.config.search_component.tipConfig.value !== '独立搜索内容' : editor.config.service_labels[0] !== '独立服务文案', category), true);
      const selected = page.locator('.editor-module-frame.selected');
      await selected.getByRole('button', { name: '隐藏' + label, exact: true }).click();
      assert.match(await selected.getByRole('button', { name: '显示' + label, exact: true }).getAttribute('class'), /iconyincang/, 'hidden state uses the same eye icon as the home editor');
      await selected.locator('.module-name').click();
      assert.equal(await selected.locator('button[title="显示"]').count(), 1, 'selecting a hidden component must keep it hidden');
      await selected.getByRole('button', { name: '上移' + label, exact: true }).click();
      assert.equal(await page.evaluate(() => editor.contentModules[0].id), copyId);
      assert.equal(await selected.getByRole('button', { name: '上移' + label, exact: true }).isDisabled(), true);
      await selected.getByRole('button', { name: '下移' + label, exact: true }).click();
      assert.equal(await page.evaluate(() => editor.contentModules[1].id), copyId);
      // Drag the independent copy above the original using the actual Sortable handle.
      const start = await frames.nth(1).locator('.module-name').boundingBox();
      const target = await frames.first().boundingBox();
      await page.mouse.move(start.x + 30, start.y + 16);
      await page.mouse.down();
      await page.mouse.move(start.x + 32, start.y + 10, { steps: 3 });
      await page.mouse.move(target.x + 40, target.y + 3, { steps: 20 });
      await page.waitForTimeout(250);
      await page.mouse.up();
      await page.waitForFunction(id => editor.contentModules[0].id === id, copyId);
      // Singleton controls report the limit without changing contents or visibility.
      await library.getByRole('button', { name: '页面标题', exact: true }).click();
      await page.getByRole('button', { name: '复制页面标题', exact: true }).click();
      assert.match(await page.locator('.el-message').last().innerText(), /只能添加一个/);
      await page.getByRole('button', { name: category ? '保存分类页' : '保存购物车页', exact: true }).click();
      await page.waitForFunction(() => saved.length === 1);
      await page.evaluate(() => mountEditor());
      await page.waitForFunction(() => !editor.loading);
      assert.equal(await page.evaluate(() => editor.contentModules[0].id), copyId);
      assert.equal(await page.evaluate(() => editor.config.extra_modules.length), 1);
      if (!category) {
        await page.evaluate(() => { const modules = editor.contentModules; editor.contentModules = [modules[0], modules.find(item => item.id === 'list'), modules.find(item => item.id === 'service')]; });
        await page.getByText('空购物车', { exact: true }).click();
        await frames.first().locator('.module-name').click();
        await page.locator('.editor-module-frame.selected').getByRole('button', { name: '下移服务保障', exact: true }).click();
        assert.equal(await page.evaluate(() => editor.config.content_order.indexOf('list')), 1, 'empty-preview sorting must preserve the omitted product list position');
        await page.getByText('有商品', { exact: true }).click();
        await frames.last().locator('.module-name').click();
      } else {
        await frames.first().locator('.module-name').click();
      }
      assert.equal(await selected.locator('button[title="显示"]').count(), 1);
      await selected.getByRole('button', { name: '删除' + label, exact: true }).click();
      assert.equal(await frames.count(), 2);
      assert.equal(await page.evaluate(() => editor.config.extra_modules.length), 0);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS ${type}: copy, independent settings, hidden icon, singleton warning, moves, drag, save/reload and delete`);
    }
    const page = await browser.newPage();
    const logoFile = 'template/admin/src/components/mobilePage/home_comb.vue';
    const wrapperFile = 'template/admin/src/components/mobilePage/common_wrapper.vue';
    const compiled = bundle('template/admin/src/pages/setting/theme/editTheme/components/CartEditor.vue', [logoFile, wrapperFile]);
    await install(page, compiled);
    await page.evaluate(({ logo, wrapper }) => {
      editor.$destroy(); document.body.innerHTML = '<div id="logo"></div>';
      const square = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>');
      window.logoPreview = new Vue({ ...loadComponent(logo).default,
        components: { common_wrapper: loadComponent(wrapper).default },
        propsData: { num: 'logo', colorStyle: { theme: '#155EEF' } },
        store: new Vuex.Store({ state: { mobildConfig: { defaultArray: { logo: { searchBox: {tabVal:1}, logoConfig: {url:square} } } } } }),
      }).$mount('#logo');
    }, { logo: Object.keys(compiled.records).find(key => key.endsWith('/mobilePage/home_comb.vue')), wrapper: Object.keys(compiled.records).find(key => key.endsWith('/mobilePage/common_wrapper.vue')) });
    const logo = page.locator('.searchBox > img');
    await logo.waitFor();
    await page.waitForFunction(() => document.querySelector('.searchBox > img').naturalWidth > 0);
    const size = await logo.boundingBox();
    assert.equal(size.width, size.height, 'a square logo must remain square in the decoration preview');
    assert.equal(await logo.evaluate(el => getComputedStyle(el).objectFit), 'contain');
    console.log('PASS carousel search: logo preserves its intrinsic aspect ratio');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
