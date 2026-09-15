const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transform } = require('./theme_component_harness.cjs');
const root = path.resolve(__dirname, '../..');
let now = 0, locale = 'zh', preview = 0;
const state = { app: { token: '' } }, calls = [];
const api = { getThemeInfo(type, data) {
  assert.equal(type, 'home');
  return new Promise((resolve, reject) => calls.push({ data, resolve, reject }));
} };
const moduleValue = { exports: {} };
vm.runInNewContext(transform(fs.readFileSync(path.join(root, 'template/uni-app/utils/homeStartup.js'), 'utf8')), {
  module: moduleValue, exports: moduleValue.exports, Date: { now: () => now },
  uni: { getStorageSync: key => key === 'locale' ? locale : preview },
  require: id => id === '@/store' ? { state } : api,
});
const { prefetchHome, loadHome } = moduleValue.exports;
const flush = () => new Promise(setImmediate);
const response = { data: { value: { banner: 'current' } } };
(async () => {
  prefetchHome();
  const first = loadHome();
  assert.equal(calls.length, 1, 'Home shares the in-flight launch request');
  calls[0].resolve(response); assert.equal(await first, response);
  let next = loadHome(); assert.equal(calls.length, 2, 'Refresh fetches current data');
  calls[1].resolve(response); await next;
  prefetchHome(); calls[2].resolve(response); await flush(); now += 1200;
  assert.equal(await loadHome(), response, 'Ad checking overlaps a completed home request');
  assert.equal(calls.length, 3);
  for (const changeScope of [() => { locale = 'en'; }, () => { state.app.token = 'new'; }, () => { preview = 7; }, () => { now += 5000; }]) {
    prefetchHome(); const previous = calls.at(-1);
    changeScope(); next = loadHome(preview ? { theme_id: preview } : {});
    assert.notEqual(calls.at(-1), previous, 'Changed user/language/theme or expired startup must fetch fresh data');
    previous.resolve({ data: 'stale' }); calls.at(-1).resolve(response); assert.equal(await next, response);
  }
  prefetchHome(); calls.at(-1).reject(new Error('offline')); await flush();
  next = loadHome(); calls.at(-1).resolve(response); assert.equal(await next, response, 'Failed prefetch does not poison retry');
  preview = 0;
  prefetchHome(); const failed = calls.at(-1); next = loadHome(); failed.reject(new Error('offline'));
  await flush(); assert.notEqual(calls.at(-1), failed, 'Failure after handoff retries through the normal home loader');
  calls.at(-1).resolve(response); assert.equal(await next, response);
  console.log('PASS: startup overlap, single consumption, refresh, scope isolation, expiry and offline retry');
})().catch(error => { console.error(error); process.exitCode = 1; });
