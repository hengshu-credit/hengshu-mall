// Execute the actual UniApp wrapper with a synthetic transport; no network or package dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = path.resolve(__dirname, '../../template/uni-app/utils/request.js');
const source = fs.readFileSync(sourcePath, 'utf8')
  .replace(/^import\s+[\s\S]*?;\s*$/gm, '')
  .replace('export default request;', 'globalThis.testRequest = request;');
async function run(response, options = {}, networkFailure = false) {
  let modals = 0, logins = 0;
  const context = {
    HTTP_REQUEST_URL: 'http://synthetic.invalid', HEADER: {}, TOKENNAME: 'Authorization', TIMEOUT: 100,
    toLogin() { logins++; }, checkLogin: () => true, store: { state: { app: { token: 'synthetic' } } },
    i18n: { t: x => x },
    uni: {
      getStorageSync() {}, showModal() { modals++; },
      request(options) { networkFailure ? options.fail({}) : options.success({ data: response }); }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: sourcePath });
  let state = 'pending', value;
  context.testRequest.get('synthetic', {}, options).then(result => { state = 'fulfilled'; value = result; }, error => { state = 'rejected'; value = error; });
  await new Promise(resolve => setImmediate(resolve));
  return { state, value, modals, logins };
}
(async () => {
  const denied = { status: 402, msg: 'Synthetic denial' };
  const deniedResult = await run(denied);
  assert.equal(deniedResult.state, 'rejected', '402 must reject even while the informational modal is open');
  assert.equal(deniedResult.modals, 1);
  assert.equal(deniedResult.value, denied, '402 must preserve the API error payload');
  assert.equal((await run({ status: 200, data: 'ok' })).state, 'fulfilled');
  const authResult = await run({ status: 401 });
  assert.equal(authResult.state, 'rejected'); assert.equal(authResult.logins, 1);
  const ordinary = await run({ status: 400, msg: 'Invalid' });
  assert.equal(ordinary.state, 'rejected'); assert.equal(ordinary.value, 'Invalid');
  const unchecked = await run(denied, { noVerify: true });
  assert.equal(unchecked.state, 'fulfilled'); assert.equal(unchecked.modals, 0);
  assert.equal((await run({}, {}, true)).state, 'rejected');
  console.log('PASS request completion: 402, 200, 401, 400, noVerify, transport failure');
})().catch(error => { console.error(error); process.exitCode = 1; });
