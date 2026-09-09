const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const babel = require(path.join(root, 'template/admin/node_modules/@babel/core'));
const { preprocess } = require(path.join(root, 'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
function load(file, imports, globals = {}) {
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.startsWith('template/uni-app/')) source = preprocess(source, { H5: true }, { type: 'js' });
  const { code } = babel.transformSync(source, { babelrc: false, configFile: false,
    plugins: [require(path.join(root, 'template/admin/node_modules/@babel/plugin-transform-modules-commonjs'))] });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: id => {
    if (!(id in imports)) throw Error('Unexpected import ' + id);
    return imports[id];
  }, ...globals });
  return module.exports;
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
async function exercise(label, read, calls, success, fail, changeScope) {
  const a = read(), b = read();
  await flush();
  assert.equal(calls.length, 1, label + ': concurrent configuration reads must share one network request');
  success(calls[0]);
  const [first, second] = await Promise.all([a, b]);
  first.data.marker = 'changed';
  assert.equal(second.data.marker, 'original', label + ': callers must not share mutable response objects');
  const next = read();
  await flush();
  assert.equal(calls.length, 2, label + ': no response cache after settlement');
  success(calls[1]);
  await next;
  const bad = [read(), read()].map(p => p.then(() => { throw Error('Expected rejection'); }, () => 'rejected'));
  await flush();
  assert.equal(calls.length, 3);
  fail(calls[2]);
  assert.deepEqual(await Promise.all(bad), ['rejected', 'rejected']);
  const retry = read();
  await flush();
  assert.equal(calls.length, 4, label + ': failed reads must be retried');
  success(calls[3]);
  await retry;
  const oldScope = read();
  changeScope();
  const newScope = read();
  await flush();
  assert.equal(calls.length, 6, label + ': changed authorization/locale must not reuse a pending response');
  success(calls[4]); success(calls[5]);
  await Promise.all([oldScope, newScope]);
}
(async () => {
  const calls = [];
  const state = { app: { token: 'first-token' } };
  let locale = 'zh-CN';
  const request = load('template/uni-app/utils/request.js', {
    '@/config/app': { HTTP_REQUEST_URL: 'http://local', HEADER: { 'content-type': 'application/json' }, TOKENNAME: 'Authori-zation', TIMEOUT: 100000 },
    '../libs/login': { toLogin() {}, checkLogin: () => true }, '../store': { state }, './lang.js': { t: t => t },
  }, { uni: { request: options => calls.push(options), getStorageSync: key => key === 'locale' ? locale : '', showModal() {} } }).default;
  const api = load('template/uni-app/api/api.js', { '@/utils/request.js': request });
  const success = call => call.success({ data: { status: 200, data: { marker: 'original' } } });
  await exercise('H5 copyright', api.getCrmebCopyRight, calls, success, call => call.fail({}), () => { state.app.token = 'next-token'; });
  const before = calls.length;
  const langA = api.getCrmebCopyRight(); locale = 'en'; const langB = api.getCrmebCopyRight();
  assert.equal(calls.length, before + 2, 'Locale changes must not share a request');
  success(calls[before]); success(calls[before + 1]); await Promise.all([langA, langB]);
  assert.equal(calls[before].header['Cb-lang'], 'zh-CN', 'Headers must remain isolated while requests are pending');
  const writes = [request.post('update', {}), request.post('update', {})];
  assert.equal(calls.length, before + 4, 'Writes must never be coalesced');
  success(calls[before + 2]); success(calls[before + 3]); await Promise.all(writes);

  const axios = require(path.join(root, 'template/admin/node_modules/axios'));
  const adminCalls = [], cookies = { token: 'admin-a' };
  const adminRequest = load('template/admin/src/libs/request.js', {
    axios: { defaults: {}, create: config => axios.create({ ...config, adapter: config => new Promise((resolve, reject) => adminCalls.push({ config, resolve, reject })) }) },
    'element-ui': { Message: { error() {} } }, '@/libs/util': { getCookies: key => cookies[key], removeCookies() {} },
    '@/setting': { apiBaseURL: '/adminapi/' }, '@/router': { replace: () => Promise.resolve() },
  });
  const adminApi = load('template/admin/src/api/kefu.js', { '@/libs/request': { __esModule: true, ...adminRequest } });
  await exercise('Admin socket config', adminApi.getWorkermanUrl, adminCalls,
    call => call.resolve({ config: call.config, data: { status: 200, data: { marker: 'original' } } }),
    call => call.reject({ msg: 'network failure' }), () => { cookies.token = 'admin-b'; });
  console.log('PASS: concurrent configuration reads, response isolation, credentials, locale, retry and unchanged write requests');
})().catch(error => { console.error(error); process.exitCode = 1; });
