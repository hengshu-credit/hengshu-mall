const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const deps = path.resolve(__dirname, '../../template/admin/node_modules');
const cleanup = require(path.join(deps, 'jsdom-global'))();
const Vue = require(path.join(deps, 'vue/dist/vue.common.js'));
Vue.config.productionTip = false;
Vue.config.devtools = false;
const ElementUI = require(path.join(deps, 'element-ui'));
Vue.use(ElementUI);
Vue.component('formCreate', {
  props: ['rule', 'option'],
  mounted() { this.$emit('mounted', { submit: submit => submit(this.option.formData) }); },
  render(h) { return h('div', '保障名称'); },
});
const babel = require(path.join(deps, '@babel/core'));
const source = fs.readFileSync(path.resolve(__dirname, '../../template/admin/src/utils/modalForm.js'), 'utf8');
const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: [require(path.join(deps, '@babel/plugin-transform-modules-commonjs'))] }).code;
const mod = { exports: {} }, saves = [], errors = [];
let failSubmit = false;
new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
  if (name === 'vue') return Vue;
  if (name === '@/libs/request') return { post: async (url, body) => {
    if (failSubmit) throw { msg: '保存失败测试' };
    saves.push({ url, body }); return { status: 200, msg: '保存成功' };
  } };
  return {};
});
const modalForm = mod.exports.default;
const flush = async () => { await new Promise(setImmediate); await Vue.nextTick(); };
const page = new Vue();
page.$message = { error: msg => errors.push(msg), success() {} };
let refreshes = 0;
function open() {
  return modalForm.call(page, Promise.resolve({ data: {
    title: '添加保障', rules: [], method: 'POST', action: '/product/protection/0', config: { formData: { title: '正品保障' } },
  } })).then(() => { refreshes++; });
}
async function closeAndFlush(button) {
  document.querySelector(button).click();
  await flush();
  await new Promise(resolve => setTimeout(resolve, 550));
}
after(() => { ElementUI.MessageBox.close(); page.$destroy(); cleanup(); });

test('real Element UI protection dialog cancels and closes without rejection, writes or success callbacks', async () => {
  for (const button of ['.el-message-box__btns .el-button--default', '.el-message-box__headerbtn']) {
    open(); await flush();
    assert.match(document.querySelector('.el-message-box').textContent, /添加保障/);
    await closeAndFlush(button);
    assert.equal(saves.length, 0);
    assert.equal(refreshes, 0);
    assert.deepEqual(errors, []);
  }
});

test('submission failure keeps the dialog usable and successful retry refreshes exactly once', async () => {
  const submitted = open(); await flush();
  failSubmit = true;
  document.querySelector('.el-message-box__btns .el-button--primary').click(); await flush();
  assert.deepEqual(errors, ['保存失败测试']);
  assert.equal(refreshes, 0);
  assert.equal(saves.length, 0);
  await new Promise(resolve => setTimeout(resolve, 550));
  failSubmit = false;
  await closeAndFlush('.el-message-box__btns .el-button--primary');
  await submitted;
  assert.equal(saves.length, 1);
  assert.equal(refreshes, 1);
});
