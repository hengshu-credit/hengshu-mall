const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require(path.join(__dirname, '../../template/admin/node_modules/@babel/core'));

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'template/uni-app/utils/runtimeApiBase.js'), 'utf8');
const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: [require(path.join(root, 'template/admin/node_modules/@babel/plugin-transform-modules-commonjs'))] }).code;
const config = { HTTP_REQUEST_URL: 'https://mall.hengshucredit.com' };
const storage = {};
const uni = {
  getLaunchOptionsSync: () => ({ query: {} }),
  getEnterOptionsSync: () => ({ query: {} }),
  getStorageSync: key => storage[key],
  setStorageSync: (key, value) => { storage[key] = value; },
};
const loaded = { exports: {} };
new Function('module', 'exports', 'require', 'uni', code)(loaded, loaded.exports, id => {
  if (id.includes('/config/app')) return config;
  return {};
}, uni);

const { initRuntimeApiBase, setRuntimeApiBase } = loaded.exports;
assert.equal(initRuntimeApiBase({ query: { api_base: 'http%3A%2F%2F10.0.2.2%3A8011' } }), 'http://10.0.2.2:8011');
assert.equal(config.HTTP_REQUEST_URL, 'http://10.0.2.2:8011');
assert.equal(storage.debugApiBase, 'http://10.0.2.2:8011');
config.HTTP_REQUEST_URL = 'https://mall.hengshucredit.com';
assert.equal(initRuntimeApiBase({ query: {} }), 'http://10.0.2.2:8011');
assert.equal(setRuntimeApiBase('javascript:alert(1)'), 'http://10.0.2.2:8011');
console.log('PASS APP runtime API base: encoded launch parameter, persisted debug address, and unsafe URL rejection');
