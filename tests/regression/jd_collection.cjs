const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const admin = path.join(root, 'template/admin');
const babel = require(path.join(admin, 'node_modules/@babel/core'));
const transformModules = require(path.join(admin, 'node_modules/@babel/plugin-transform-modules-commonjs'));
const compiler = require(path.join(admin, 'node_modules/vue-template-compiler'));

function loadModule(file, imports = {}) {
  let source = fs.readFileSync(path.join(admin, 'src', file), 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  const { code } = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [transformModules],
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    console,
    Promise,
    setTimeout,
    clearTimeout,
    require(id) {
      if (Object.prototype.hasOwnProperty.call(imports, id)) return imports[id];
      if (id === 'vuex') return { mapState: () => ({}) };
      if (id.startsWith('@/') || id.startsWith('../') || id.startsWith('./')) return {};
      return require(id);
    },
  }, { filename: file });
  return module.exports;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

function fakeClock() {
  let current = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    now: () => current,
    setTimeoutFn(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, due: current + delay });
      return id;
    },
    clearTimeoutFn(id) { timers.delete(id); },
    async tick(milliseconds) {
      current += milliseconds;
      const due = [...timers.entries()].filter(([, timer]) => timer.due <= current);
      due.forEach(([id]) => timers.delete(id));
      due.forEach(([, timer]) => timer.callback());
      await flush();
    },
    pending: () => timers.size,
  };
}

async function testRunner() {
  const helper = loadModule('libs/productCollection.js');
  assert.equal(helper.validateCollectionUrl(' https://item.m.jd.com/product/100.html '), 'https://item.m.jd.com/product/100.html');
  for (const invalid of ['', 'ftp://item.jd.com/100.html', 'javascript:alert(1)', `https://jd.com/${'x'.repeat(2040)}`]) {
    assert.throws(() => helper.validateCollectionUrl(invalid), /请输入|链接/);
  }

  {
    const calls = [];
    const runner = helper.createCollectionRunner({ request: async payload => {
      calls.push(payload);
      return { data: { productInfo: { store_name: 'legacy' } } };
    } });
    const result = await runner.collect({ type: 'taobao', url: 'https://detail.tmall.com/item.htm?id=1' });
    assert.equal(result.productInfo.store_name, 'legacy');
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ type: 'taobao', url: 'https://detail.tmall.com/item.htm?id=1' }]);
  }

  {
    const clock = fakeClock();
    const replies = [
      { data: { task_id: 'jd-task', state: 'queued' } },
      { data: { task_id: 'jd-task', state: 'running' } },
      { data: { productInfo: { store_name: 'JD result' } } },
    ];
    const calls = [];
    const runner = helper.createCollectionRunner({
      request: async payload => { calls.push(payload); return replies.shift(); },
      ...clock,
      pollIntervalMs: 2000,
      maxDurationMs: 360000,
    });
    const collected = runner.collect({ type: 'taobao', url: 'https://item.jd.com/100.html' });
    await flush();
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ type: 'taobao', url: 'https://item.jd.com/100.html' }]);
    await clock.tick(2000);
    assert.deepEqual(JSON.parse(JSON.stringify(calls[1])), { task_id: 'jd-task' });
    await clock.tick(2000);
    assert.equal((await collected).productInfo.store_name, 'JD result');
    assert.equal(clock.pending(), 0);
  }

  {
    const clock = fakeClock();
    let calls = 0;
    const runner = helper.createCollectionRunner({
      request: async () => {
        calls += 1;
        if (calls === 1) return { data: { task_id: 'failed-task', state: 'queued' } };
        throw { status: 400, msg: '京东登录已失效，请人工登录后重试' };
      },
      ...clock,
    });
    const collected = runner.collect({ type: 'taobao', url: 'https://item.jd.com/101.html' });
    await flush();
    await clock.tick(2000);
    await assert.rejects(collected, /人工登录/);
    assert.equal(calls, 2, 'A failed task must not create a second collection job');
  }

  {
    const clock = fakeClock();
    let calls = 0;
    const runner = helper.createCollectionRunner({
      request: async () => ({ data: { task_id: 'slow-task', state: calls++ ? 'running' : 'queued' } }),
      ...clock,
      pollIntervalMs: 2000,
      maxDurationMs: 4000,
    });
    const collected = runner.collect({ type: 'taobao', url: 'https://item.jd.com/102.html' });
    await flush();
    await clock.tick(2000);
    await clock.tick(2000);
    await assert.rejects(collected, /超时/);
    assert.equal(calls, 2, 'Timeout must stop before another backend poll');
  }

  {
    const clock = fakeClock();
    let calls = 0;
    const runner = helper.createCollectionRunner({
      request: async () => {
        calls += 1;
        return { data: { task_id: 'cancelled-task', state: 'queued' } };
      },
      ...clock,
    });
    const collected = runner.collect({ type: 'taobao', url: 'https://item.jd.com/103.html' });
    await flush();
    assert.equal(clock.pending(), 1);
    runner.cancel();
    assert.equal(clock.pending(), 0, 'Cancellation must clear a scheduled poll');
    await assert.rejects(collected, error => helper.isCollectionCancelled(error));
    await clock.tick(2000);
    assert.equal(calls, 1, 'Cancellation must prevent another backend poll');
  }

  {
    const clock = fakeClock();
    const initial = deferred();
    const runner = helper.createCollectionRunner({ request: () => initial.promise, ...clock });
    const collected = runner.collect({ type: 'taobao', url: 'https://item.jd.com/104.html' });
    runner.cancel();
    initial.resolve({ data: { productInfo: { store_name: 'stale' } } });
    await assert.rejects(collected, error => helper.isCollectionCancelled(error));
    assert.equal(clock.pending(), 0);
  }
}

async function testCollectorComponent() {
  const helper = loadModule('libs/productCollection.js');
  const apiCalls = [];
  const api = {
    copyConfigApi: async () => ({ data: { copy_type: 1, copy_num: 9, jd_enabled: true, jd_configured: true } }),
    crawlFromApi: async payload => {
      apiCalls.push(payload);
      return { data: { productInfo: {
        store_name: 'JD phone',
        soure_link: '',
        attr: { price: 0, stock: 0 },
        collection_warnings: ['详情页未提供价格'],
      } } };
    },
  };
  const component = loadModule('pages/product/productAdd/taoBao.vue', {
    '@/api/product': api,
    '@/libs/productCollection': helper,
  }).default;
  const collectorSource = fs.readFileSync(path.join(admin, 'src/pages/product/productAdd/taoBao.vue'), 'utf8');
  const collectorTemplate = collectorSource.match(/<template>([\s\S]*?)<\/template>/)[1];
  assert.deepEqual(compiler.compile(collectorTemplate).errors, [], 'The collection dialog template must compile');
  const emitted = [];
  const warnings = [];
  const ctx = {
    ...component.data(),
    $emit: (...args) => emitted.push(args),
    $message: { warning: message => warnings.push(message), error: message => warnings.push(message) },
    $routeProStr: '/admin',
    $router: { push() {} },
  };
  for (const [name, method] of Object.entries(component.methods)) ctx[name] = method.bind(ctx);
  component.created.call(ctx);
  await ctx.getCopyConfig();
  assert.equal(ctx.copyConfigStatus, 'ready');
  assert.equal(ctx.copyConfig.jd_enabled, true);
  assert.equal(ctx.copyConfig.jd_configured, true);
  ctx.soure_link = 'https://item.m.jd.com/product/104.html';
  const first = ctx.add();
  const second = ctx.add();
  await Promise.all([first, second]);
  assert.equal(apiCalls.length, 1, 'Repeated submit clicks must share the active collection');
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0][1].soure_link, ctx.soure_link, 'The submitted source link must survive collection');
  assert.equal(ctx.spinShow, false);
  assert.match(warnings.join('\n'), /价格.*手动|手动.*价格/);

  const configErrors = [];
  api.copyConfigApi = async () => { throw { msg: 'config offline' }; };
  ctx.$message.error = message => configErrors.push(message);
  await ctx.getCopyConfig();
  assert.equal(ctx.copyConfigStatus, 'error');
  assert.deepEqual(configErrors, [], 'Configuration read failures stay inline and do not block legacy collection');

  const pending = deferred();
  api.crawlFromApi = () => pending.promise;
  const staleCtx = {
    ...component.data(),
    $emit: (...args) => emitted.push(args),
    $message: { warning() {}, error() {} },
  };
  for (const [name, method] of Object.entries(component.methods)) staleCtx[name] = method.bind(staleCtx);
  component.created.call(staleCtx);
  staleCtx.soure_link = 'https://item.jd.com/105.html';
  const staleRun = staleCtx.add();
  component.beforeDestroy.call(staleCtx);
  pending.resolve({ data: { productInfo: { store_name: 'too late' } } });
  await staleRun;
  assert.equal(emitted.length, 1, 'Destroying the dialog must ignore a late response');
}

function testAddPageBackfill() {
  const component = loadModule('pages/product/productAdd/index.vue').default;
  const warnings = [];
  const ctx = {
    formValidate: {
      logistics: ['1'], freight: 2, postage: 0, recommend: [], cate_id: [], label_id: [], coupons: [],
      coupon_ids: [], custom_form: [], is_sub: [], label_list: [], protection_list: [], slider_image: [],
      unit_name: '', spec_type: 0, virtual_type: 0, is_virtual: 0, is_show: 1, required_default: 'kept',
    },
    attrs: [], oneFormValidate: [], manyFormValidate: [], oneFormBatch: [], contents: '', content: '',
    dataLabel: [], couponName: [], updateIds: [], updateName: [], canSel: true, createBnt: false, customBtn: 0,
    virtualbtn() {}, getproductLabelUseListApi() {}, checkAllGroup() {}, watchActivity() {}, generateHeader() {},
    $route: { params: {} },
    $message: { warning: message => warnings.push(message) },
  };
  ctx.showCollectionWarnings = component.methods.showCollectionWarnings.bind(ctx);
  ctx.infoData = component.methods.infoData.bind(ctx);
  ctx.onClose = component.methods.onClose.bind(ctx);
  ctx.openCollection = component.methods.openCollection.bind(ctx);
  ctx.type = 0;
  ctx.openCollection();
  assert.equal(ctx.modals, true);
  assert.equal(ctx.type, 0, 'Opening and cancelling collection must not change the save mode');
  ctx.onClose({
    store_name: 'Collected product',
    description: '<p>details</p>',
    attr: { price: 0, stock: 0, pic: 'https://img.example/a.jpg' },
    soure_link: 'https://item.jd.com/106.html',
    spec_type: 0,
    collection_warnings: ['采集弹窗已经提示过'],
  });
  assert.equal(ctx.type, -1, 'Collected products must use the existing image-download save path');
  assert.equal(ctx.formValidate.is_show, 0, 'Collected products default to unpublished');
  assert.equal(ctx.formValidate.required_default, 'kept', 'Sparse collection results retain initialized form defaults');
  assert.equal(Object.prototype.hasOwnProperty.call(ctx.formValidate, 'attr'), false, 'Single-SKU helper data must not leak into the save payload');
  assert.equal(Object.prototype.hasOwnProperty.call(ctx.formValidate, 'collection_warnings'), false, 'Display-only warnings must not leak into the save payload');
  assert.deepEqual(Array.from(ctx.formValidate.cate_id), []);
  assert.deepEqual(Array.from(ctx.formValidate.label_id), []);
  assert.equal(ctx.oneFormValidate[0].price, 0, 'Single-SKU collection uses productInfo.attr');
  assert.equal(ctx.contents, '<p>details</p>');
  assert.equal(ctx.content, '<p>details</p>');
  assert.deepEqual(warnings, [], 'Collection backfill must not repeat warnings already shown by the collector');

  ctx.$route.params.id = '106';
  ctx.infoData({
    ...ctx.formValidate,
    cate_id: [],
    label_id: [],
    coupons: [],
    items: [],
    attrs: [],
    collection_warnings: ['远程视频尚未转存，请检查后重试'],
  });
  assert.deepEqual(warnings, ['远程视频尚未转存，请检查后重试']);
  assert.equal(Object.prototype.hasOwnProperty.call(ctx.formValidate, 'collection_warnings'), false);

  const source = fs.readFileSync(path.join(admin, 'src/pages/product/productAdd/index.vue'), 'utf8');
  const template = source.match(/<template>([\s\S]*?)<\/template>/)[1];
  const ast = compiler.compile(template).ast;
  const stack = [ast];
  let collectionButton = null;
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (node.tag === 'el-button' && node.children && node.children.some(child => child.text && child.text.includes('链接采集'))) {
      collectionButton = node;
      break;
    }
    stack.push(...(node.children || []));
  }
  assert.ok(collectionButton, 'The plain new-product page must render a link collection button');
  assert.match(collectionButton.attrsMap['v-if'], /route\.params\.id/);
  assert.match(collectionButton.attrsMap['v-auth'], /product-crawl-save/);
}

async function testSaveWarnings() {
  const warnings = [];
  const successes = [];
  const navigations = [];
  const api = {
    productAddApi: async () => ({
      msg: '保存成功',
      data: { collection_warnings: ['商品已保存，但远程视频尚未转存'] },
    }),
  };
  const component = loadModule('pages/product/productAdd/index.vue', {
    '@/api/product': api,
    '@/utils/editorImg': { formatRichText: value => value },
  }).default;
  const ctx = {
    formValidate: { spec_type: 0, is_sub: [], freight: 1, label_id: [], description: '' },
    oneFormValidate: [{ stock: 0, vip_price: 0 }],
    manyFormValidate: [],
    attrs: [],
    dataLabel: [],
    openSubimit: false,
    content: '<p>saved</p>',
    type: -1,
    $refs: { formValidate: { validate: callback => callback(true) } },
    $message: {
      success: message => successes.push(message),
      warning: message => warnings.push(message),
      error: error => { throw new Error(error); },
    },
    $route: { params: {} },
    $routeProStr: '/admin',
    $router: { push: route => navigations.push(route) },
  };
  ctx.showCollectionWarnings = component.methods.showCollectionWarnings.bind(ctx);
  component.methods.handleSubmit.call(ctx, 'formValidate');
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(successes, ['保存成功']);
  assert.deepEqual(warnings, ['商品已保存，但远程视频尚未转存']);
  assert.equal(ctx.openSubimit, false, 'A saved product must not stay submission-locked after a warning');
  await new Promise(resolve => setTimeout(resolve, 550));
  assert.deepEqual(
    JSON.parse(JSON.stringify(navigations)),
    [{ path: '/admin/product/product_list' }],
    'Warnings must not block the normal redirect',
  );
}

(async () => {
  await testRunner();
  await testCollectorComponent();
  testAddPageBackfill();
  await testSaveWarnings();
  console.log('PASS: JD collection immediate/async/error/timeout/cancel, config fallback, duplicate guard and add-page backfill');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
