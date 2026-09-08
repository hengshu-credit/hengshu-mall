// Execute real Vue methods with synthetic native OAuth/API boundaries.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const filename = path.resolve(__dirname, '../../template/uni-app/pages/users/login/index.vue');
const script = fs.readFileSync(filename, 'utf8').split('<script>')[1].split('</script>')[0]
  .replace(/^import .*;\r?$/gm, '').replace('export default', 'globalThis.component =');
let payloads = [], logoutCount = 0, hideCount = 0;
let loginResult, userResult;
let apiError = null;
const appleService = { id: 'apple', logout(success) { logoutCount++; success(); } };
const context = {
  Verify: {}, sendVerifyCode: {}, colors: {}, Cache: { get() {} }, console,
  appleLogin(data) {
    payloads.push(data);
    return apiError ? Promise.reject(apiError) : Promise.resolve({ data: { isbind: true } });
  },
  plus: { oauth: { getServices(success) { success([appleService]); } } },
  uni: {
    showLoading() {}, hideLoading() { hideCount++; }, showToast() {},
    showModal(opts) { if (opts.success) opts.success({ confirm: true }); },
    login(opts) { opts.success(loginResult); },
    getUserInfo(opts) { opts.success(userResult); if (opts.complete) opts.complete(); }
  }
};
vm.createContext(context);
vm.runInContext(script, context, { filename });
const page = { ...context.component.methods, $t: x => x, protocol: true, account: '', captcha: '' };
(async () => {
  for (const source of ['userInfo', 'authResult', 'loginAuthResult', 'appleInfo']) {
    appleService.appleInfo = source === 'appleInfo' ? { identityToken: 'signed-token' } : {};
    loginResult = source === 'loginAuthResult' ? { authResult: { identityToken: 'signed-token' } } : {};
    userResult = { userInfo: { openId: 'apple-subject', email: 'a@example.test' } };
    if (source === 'userInfo') userResult.userInfo.identityToken = 'signed-token';
    if (source === 'authResult') userResult.authResult = { identityToken: 'signed-token' };
    page.appleLogin();
    await new Promise(setImmediate);
    assert.strictEqual(payloads.at(-1).identityToken, 'signed-token', `${source}: submits identity credential`);
    assert.strictEqual(page.appleLoginStatus, true, 'preserves binding prompt');
    page.account = '13800000000'; page.captcha = '123456';
    page.appleLoginApi();
    await new Promise(setImmediate);
    assert.strictEqual(payloads.at(-1).identityToken, 'signed-token', 'binding resubmits credential');
    assert.strictEqual(payloads.at(-1).phone, '13800000000');
    assert.strictEqual(payloads.at(-1).captcha, '123456');
  }
  assert.strictEqual(logoutCount, 4, 'refreshes native authorization instead of reusing expired identityToken');
  assert(hideCount >= 4, 'loading settles after authorization');
  apiError = 'Apple credential expired';
  const requestCount = payloads.length;
  page.appleLoginApi();
  await new Promise(setImmediate);
  assert.strictEqual(page.appleLoginStatus, false, 'expired proof restores visible Apple authorization button');
  assert.strictEqual(page.appleUserInfo, null, 'discards rejected credential');
  assert.strictEqual(page.account, '13800000000', 'keeps entered binding phone');
  assert.strictEqual(page.captcha, '123456', 'keeps entered SMS code');
  assert.strictEqual(payloads.length, requestCount + 1, 'does not automatically loop on auth failure');
  apiError = null;
  appleService.appleInfo = { identityToken: 'fresh-signed-token' };
  page.appleLogin();
  await new Promise(setImmediate);
  assert.strictEqual(logoutCount, 5, 'recovery obtains fresh native authorization');
  assert.strictEqual(payloads.at(-1).identityToken, 'fresh-signed-token', 'retry replaces expired proof');
  assert.strictEqual(payloads.at(-1).phone, '13800000000', 'reauthorization preserves binding phone');
  assert.strictEqual(payloads.at(-1).captcha, '123456', 'reauthorization preserves binding SMS proof');
  console.log('PASS: Apple frontend credentials, fresh authorization and phone binding');
})().catch(error => { console.error(error); process.exitCode = 1; });
