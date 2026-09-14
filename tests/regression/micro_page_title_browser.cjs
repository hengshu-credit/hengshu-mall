const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { loadShared } = require('./ranking_shared_loader.cjs');
const { defaultMicroPage, microPageWithTitle } = loadShared('pageTitleComponent');
const root = path.resolve(__dirname, '../..'), out = path.join(root, '.build/ranking-review');

// Migration is shared by editor and mobile, and never restores a deleted/hidden title.
const legacy = { title: '旧专题名称', value: { 10: { name: 'blankPage', timestamp: 10, heightConfig: { val: 80 } } } };
const migrated = microPageWithTitle(legacy);
assert.equal(Object.values(migrated.value).filter(n => n.name === 'pageTitleBar').length, 1);
assert(Object.values(migrated.value).find(n => n.name === 'pageTitleBar').timestamp < 10);
assert.deepEqual(legacy.value, { 10: { name: 'blankPage', timestamp: 10, heightConfig: { val: 80 } } });
assert.deepEqual(microPageWithTitle(migrated), migrated);
assert.deepEqual(microPageWithTitle({ ...migrated, value: {} }).value, {});
const hidden = defaultMicroPage(); Object.values(hidden.value)[0].isHide = true;
assert.deepEqual(microPageWithTitle(JSON.parse(JSON.stringify(hidden))), hidden);

const servers = [];
function serve(folder, prefix = '') {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://local').pathname;
    if (pathname.startsWith('/api/')) return http.get('http://127.0.0.1:8011' + req.url, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    }).on('error', () => { res.writeHead(502); res.end(); });
    let file = path.resolve(folder, '.' + pathname.replace(prefix, ''));
    if (!file.startsWith(folder + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(folder, 'index.html');
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.ttf': 'font/ttf' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  servers.push(server);
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port)));
}

(async () => {
  const [adminBase, mobileBase] = await Promise.all([serve(path.join(out, 'admin'), /^\/admin/), serve(path.join(out, 'h5'))]);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let saved = null, saves = 0;
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addCookies([{ name: 'from-crmeb-admin:token', value: 'fixture-only', url: adminBase }]);
    await context.addInitScript(() => localStorage.setItem('vuex', JSON.stringify({ userInfo: { uniqueAuth: ['fixture-theme'], userInfo: { id: 1 } } })));
    await context.routeWebSocket('**/*', () => {});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/adminapi/**', async route => {
      const u = new URL(route.request().url()); let data = {};
      if (route.request().resourceType() === 'script' || u.pathname.endsWith('/custom_admin_js')) return route.fulfill({ contentType: 'application/javascript', body: '' });
      if (/\/theme\/info\/\d+\/home$/.test(u.pathname)) data = saved || {};
      else if (/\/theme\/info\/\d+\/base$/.test(u.pathname)) data = { id: 42, title: '测试专题' };
      else if (/\/theme\/info\/\d+\/theme$/.test(u.pathname)) data = { theme_color: '#155EEF' };
      else if (/\/theme\/save\//.test(u.pathname)) { const body = route.request().postDataJSON(); assert.equal(body.page_type, 'micro'); saved = body.value; saves++; data = { id: 42 }; }
      else if (/category_list/.test(u.pathname)) data = [];
      return route.fulfill({ json: { status: 200, msg: '成功', data } });
    });
    const ready = () => page.waitForFunction(() => document.querySelector('.diy-page')?.__vue__.loading === false);
    const save = async () => { const before = saves; await page.getByRole('button', { name: '保存', exact: true }).click(); await page.waitForFunction(() => !document.querySelector('.diy-page').__vue__.loading); assert.equal(saves, before + 1); };
    await page.goto(adminBase + '/admin/setting/edit_theme?id=0&type=home&page_type=micro'); await ready();
    assert.equal(await page.locator('.overflowy > .page-title').count(), 0, 'no fixed legacy heading');
    assert.equal(await page.locator('.scroll-box .page-title-preview').count(), 1, 'new page starts with the real title component');
    await page.locator('.right-box .title-content input').first().fill('春日好物专题');
    assert.equal(await page.locator('.scroll-box .page-title-text').textContent(), '春日好物专题');
    await page.getByRole('button', { name: '隐藏页面标题', exact: true }).click();
    assert.equal(await page.locator('.overflowy > .page-title').count(), 0, 'hiding does not restore the legacy heading');
    await save(); const hiddenSaved = JSON.parse(JSON.stringify(saved));
    await page.reload(); await ready();
    assert.equal(await page.locator('.scroll-box .mConfig-item.hide').count(), 1);
    await page.locator('.scroll-box .mConfig-item').click();
    await page.getByRole('button', { name: '显示页面标题', exact: true }).click();
    await page.getByRole('button', { name: '删除页面标题', exact: true }).click();
    await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click();
    assert.equal(await page.locator('.scroll-box .page-title-preview').count(), 0);
    assert.equal(await page.locator('.overflowy > .page-title').count(), 0);
    await save(); assert.equal(saved.page_title_mode, 'component'); assert.deepEqual(saved.value, {});
    const deletedSaved = JSON.parse(JSON.stringify(saved));
    await page.reload(); await ready(); assert.equal(await page.locator('.page-title-preview').count(), 0, 'saved deletion survives reopening');
    await page.locator('.diy-wrapper .left .list-group-item').filter({ hasText: '页面标题' }).click();
    assert.equal(await page.locator('.page-title-preview').count(), 1, 'title can be added again from basic components');
    await page.locator('.right-box .title-content input').first().fill('重新添加的专题标题');
    await save(); const restoredSaved = JSON.parse(JSON.stringify(saved));
    await page.screenshot({ path: path.join(out, 'micro-title-editor.png') });
    saved = legacy;
    await page.reload(); await ready();
    assert.equal(await page.locator('.page-title-text').textContent(), '旧专题名称');
    assert.equal(await page.locator('.overflowy > .page-title').count(), 0);
    assert.equal(await page.locator('.scroll-box .mConfig-item').count(), 2, 'existing content survives migration');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    mobile.on('pageerror', e => errors.push(e.message));
    let mobilePage = restoredSaved;
    await mobile.route('**/api/**', async route => {
      const u = new URL(route.request().url()); let data;
      if (u.pathname === '/api/theme_info/home') data = mobilePage;
      else if (u.pathname === '/api/theme/navigation') data = [];
      else if (route.request().method() !== 'GET') data = {};
      else return route.continue();
      return route.fulfill({ json: { status: 200, msg: '成功', data } });
    });
    for (const [config, count, title] of [[restoredSaved, 1, '重新添加的专题标题'], [hiddenSaved, 0, ''], [deletedSaved, 0, ''], [legacy, 1, '旧专题名称']]) {
      mobilePage = config;
      await mobile.goto(mobileBase + '/pages/annex/special/index?theme_id=42');
      await mobile.waitForFunction(() => getCurrentPages().at(-1)?.$vm.currentDiyData.page_title_mode === 'component');
      assert.equal(await mobile.locator('.page-design .page-title-bar').count(), count);
      assert.equal(await mobile.locator('uni-page-head:visible').count(), 0, 'native header must not duplicate or replace the component');
      if (title) assert.equal(await mobile.locator('.page-title-text').textContent(), title);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: new topic uses basic title, edit/hide/delete/save/reopen/re-add, legacy title migration, and production H5 without a fallback/native heading');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => servers.forEach(server => { server.closeAllConnections(); server.close(); }));
