const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../../template/uni-app/pages/users/login/index.vue'), 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*;\r?$/gm, '')
  .replace('export default', 'module.exports =');
const modals = [], requests = [];
const context = {
  module: { exports: {} }, sendVerifyCode: {}, colors: {}, Verify: {}, Cache: { get() {} },
  uni: { showModal(options) { modals.push(options); } },
  loginH5(data) { requests.push(data); return Promise.reject('密码错误'); },
  loginMobile(data) { requests.push(data); return Promise.reject('验证码错误'); },
};
vm.runInNewContext(source, context);
const options = context.module.exports;
function page() {
  const instance = { $t: text => text, $set(target, key, value) { target[key] = value; }, $Cache: { get() {} }, $util: { Tips() {} } };
  Object.assign(instance, options.data.call(instance));
  for (const [name, method] of Object.entries(options.methods)) instance[name] = method.bind(instance);
  Object.assign(instance, { account: '13800138000', password: 'test-password', captcha: '123456' });
  return instance;
}
const flush = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  for (const method of ['submit', 'loginMobile']) {
    modals.length = requests.length = 0;
    const instance = page();
    await instance[method]();
    await instance[method]();
    assert.equal(modals.length, 1, 'Repeated clicks must show only one agreement dialog');
    assert.equal(requests.length, 0, 'No login request before consent');
    modals.pop().success({ cancel: true });
    assert.equal(instance.protocol, false);
    assert.equal(requests.length, 0, 'Declining must not log in');
    await instance[method]();
    modals.pop().success({ confirm: true });
    await flush();
    assert.equal(requests.length, 1, 'Confirming must immediately request login');
    assert.equal(instance.protocol, true, 'Failed login must preserve consent');
    assert.equal(instance.keyLock, true, 'Failed login must allow retry');
    await instance[method]();
    await flush();
    assert.equal(modals.length, 0, 'Retry must not ask for consent again');
    assert.equal(requests.length, 2);
    instance.ChangeIsDefault();
    await instance[method]();
    assert.equal(modals.length, 1, 'Manually unchecking must require consent again');
    modals.pop().success({ cancel: true });
  }
  for (const method of ['wxLogin', 'appleLogin']) {
    const instance = page();
    instance[method]();
    assert.equal(instance.account, '13800138000', 'Awaiting consent must preserve entered credentials');
    let continued = 0;
    instance[method] = () => { continued++; };
    modals.pop().success({ confirm: true });
    assert.equal(instance.protocol, true);
    assert.equal(continued, 1);
  }
  const instance = page();
  instance.confirmLoginProtocol(() => assert.fail('Dialog failure must not log in'));
  modals.pop().fail();
  assert.equal(instance.protocolConfirmVisible, false);
  assert.equal(instance.protocol, false);
  console.log('PASS login agreement: confirm, decline, duplicate clicks, failed-login retry, third-party continuation');
})().catch(error => { console.error(error); process.exitCode = 1; });
