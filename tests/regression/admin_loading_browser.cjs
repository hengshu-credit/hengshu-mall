// Live source build + isolated read fixtures. No admin login or business writes.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const XLSX = require(path.join(root, 'template/admin/node_modules/xlsx'));
const cases = [
  ['/admin/user/label', '/user/user_label_cate/all', '/user/user_label', false, 'labelLists'],
  ['/admin/marketing/channel_code/channelCodeIndex', '/app/wechat_qrcode/cate/list', '/app/wechat_qrcode/list', true, 'tableList'],
  ['/admin/setting/store_service/speechcraft', '/app/wechat/speechcraftcate', '/app/wechat/speechcraft', true, 'tableList'],
];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    const errors = [], timings = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:8011/admin/login', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('请输入用户名').waitFor();
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(r => /admin-(order-)?export/.test(r.name))), false);
    const downloads = [];
    for (let i = 0; i < 2; i++) {
      const downloadReady = page.waitForEvent('download');
      await page.evaluate(i => document.getElementById('app').__vue__.$root.$exportExcel(
        ['名称', '数值', '布尔'], ['name', 'number', 'flag'], '后台导出验证' + i,
        [{ name: '中文测试', number: 12.5, flag: true }, { name: '第二行', number: 0, flag: false }]), i);
      const download = await downloadReady;
      assert.equal(download.suggestedFilename(), '后台导出验证' + i + '.xlsx');
      const file = path.join(root, 'help/dev/.state', 'admin-export-' + i + '.xlsx');
      await download.saveAs(file);
      const book = XLSX.readFile(file);
      assert.deepEqual(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, raw: true }),
        [['名称', '数值', '布尔'], ['中文测试', 12.5, true], ['第二行', 0, false]]);
      downloads.push(file);
    }
    for (const [pathname, categoryPath, listPath, nested, listKey] of cases) {
      const requests = [];
      await page.route('**/adminapi/**', async route => {
        const url = new URL(route.request().url());
        assert.equal(route.request().method(), 'GET', 'Read-only browser fixture');
        const isCategory = url.pathname === '/adminapi' + categoryPath;
        assert.ok(isCategory || url.pathname === '/adminapi' + listPath, 'Unexpected API: ' + url.pathname);
        const entry = { path: url.pathname, start: performance.now() };
        requests.push(entry);
        await new Promise(resolve => setTimeout(resolve, isCategory ? 500 : 200));
        const category = [{ id: 1, name: '测试分类', cate_name: '测试分类' }];
        const rows = [{ id: 1, label_name: [], name: '测试渠道码', cate_name: '测试分类', title: '测试话术', message: '测试内容' }];
        if (listKey === 'labelLists') rows[0].label_name = '测试标签';
        const data = isCategory ? (nested ? { data: category } : category) : { list: rows, count: 1 };
        await route.fulfill({ json: { status: 200, data } });
        entry.end = performance.now();
      });
      await page.evaluate(async pathname => {
        const root = document.getElementById('app').__vue__.$root;
        const route = root.$router.resolve(pathname).route;
        const component = route.matched[route.matched.length - 1].components.default;
        const options = typeof component === 'function' ? (await component()).default : component;
        window.__loadingProbe = new root.constructor({ ...options, parent: root });
        window.__loadingProbe.$mount();
        document.body.appendChild(window.__loadingProbe.$el);
        if (options.activated) options.activated.call(window.__loadingProbe);
      }, pathname);
      await page.waitForFunction(key => window.__loadingProbe[key].length === 1 && !window.__loadingProbe.loading, listKey);
      assert.equal(requests.length, 2, 'Exactly one category and one list request');
      assert.ok(Math.abs(requests[0].start - requests[1].start) < 200, 'Both reads start together');
      timings.push({ pathname, startGapMs: Math.round(Math.abs(requests[0].start - requests[1].start)),
        allResponsesMs: Math.round(Math.max(...requests.map(r => r.end)) - Math.min(...requests.map(r => r.start))) });
      await page.evaluate(() => { window.__loadingProbe.$destroy(); window.__loadingProbe.$el.remove(); });
      await page.unroute('**/adminapi/**');
    }
    await page.evaluate(async () => {
      const root = document.getElementById('app').__vue__.$root;
      const route = root.$router.resolve('/admin/order/list').route;
      const module = await route.matched[route.matched.length - 1].components.default();
      window.__orderExport = module.default.components.productListDetails.components.tableList.methods.exportList;
    });
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(r => /admin-order-export/.test(r.name))), false,
      'Loading order page code must not fetch ExcelJS');
    const orderDownloadReady = page.waitForEvent('download');
    await page.evaluate(() => window.__orderExport.call({ orderType: 0, delIdList: [],
      getExcelData: async () => ({ header: ['订单', '金额'], filename: '订单导出验证', export: [['测试订单', 12.5]] }),
    }));
    const orderDownload = await orderDownloadReady;
    assert.equal(orderDownload.suggestedFilename(), '订单导出验证.xlsx');
    const orderFile = path.join(root, 'help/dev/.state/admin-order-export.xlsx');
    await orderDownload.saveAs(orderFile);
    const orderBook = XLSX.readFile(orderFile);
    assert.deepEqual(XLSX.utils.sheet_to_json(orderBook.Sheets[orderBook.SheetNames[0]], { header: 1, raw: true }),
      [['订单导出验证'], ['订单', '金额'], ['测试订单', 12.5]]);
    downloads.push(orderFile);
    assert.deepEqual(errors, [], 'No browser runtime errors');
    fs.writeFileSync(path.join(root, 'help/dev/.state/admin-loading-browser.json'), JSON.stringify({ timings, downloads, errors }, null, 2));
    console.log('PASS: live browser parallel reads on 3 pages, lazy global/order exports, repeat download and exact workbook values');
    console.log(JSON.stringify(timings));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
