const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const parser = require(path.join(root, 'template/admin/node_modules/@babel/parser'));
const file = path.join(root, 'template/uni-app/pages/index/index.vue');
const source = fs.readFileSync(file, 'utf8').split('<script>')[1].split('</script>')[0];
const ast = parser.parse(source, { sourceType: 'module' });
const component = ast.program.body.find(n => n.type === 'ExportDefaultDeclaration').declaration;
const methods = component.properties.find(n => n.key.name === 'methods');
const method = methods.value.properties.find(n => n.key?.name === 'getDiyData');
let response, fail, calls = 0;
const load = vm.runInNewContext('(function ' + source.slice(method.start, method.end) + ')', {
  getThemeInfo() { calls++; return fail ? Promise.reject(response) : Promise.resolve(response); },
  uni: { setStorageSync() {}, hideLoading() {}, showToast() {} },
});
const page = { themeId: 0, errorNetwork: false, homeLoading: false, homeErrorMessage: '',
  $t: text => text, setDiyData(data) { this.currentDiyData = data; this.errorNetwork = false; } };
const flush = () => new Promise(setImmediate);
(async () => {
  // The request wrapper rejects business/HTTP errors as strings, transport failures as objects.
  for (const error of ['数据不存在', '系统错误', { status: 1 }, null]) {
    response = error; fail = true; page.errorNetwork = false;
    load.call(page);
    assert.equal(page.homeLoading, true, 'First launch/retry must render a loading state');
    await flush();
    assert.equal(page.errorNetwork, true, 'Every failed home request must render a recoverable error');
    assert.ok(page.homeErrorMessage, 'Failure must have visible feedback');
    assert.equal(page.homeLoading, false, 'Failure must settle loading');
  }
  fail = false; response = { data: { type: 'home', value: { banner: { name: 'homeComb' } } } };
  load.call(page); load.call(page);
  await flush();
  assert.equal(calls, 5, 'Do not overlap home requests during retry');
  assert.equal(page.errorNetwork, false, 'Retry success must restore page content');
  assert.equal(page.currentDiyData, response.data);
  assert.equal(page.homeLoading, false);
  console.log('PASS: home startup business/HTTP/offline errors, loading and retry recovery');
})().catch(error => { console.error(error); process.exitCode = 1; });
