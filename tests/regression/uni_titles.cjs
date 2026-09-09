const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const Vue = require(path.join(root, 'template/admin/node_modules/vue'));
const compiler = require(path.join(root, 'template/admin/node_modules/vue-template-compiler'));
const filename = path.join(root, 'template/uni-app/subpackage/diyComponents/titles.vue');
const source = compiler.parseComponent(fs.readFileSync(filename, 'utf8'));
const component = vm.runInNewContext(
  source.script.content.replace(/^import .*;$/m, '').replace('export default', 'module.exports ='),
  { module: { exports: {} }, commonWrapper: {} },
  { filename },
);
const compiled = compiler.compile(source.template.content);
assert.deepEqual(compiled.errors, []);
component.render = new Function(compiled.render);
component.staticRenderFns = compiled.staticRenderFns.map((code) => new Function(code));

// Shape used by the user-page titles in crmeb/public/install/crmeb.sql.
function config(colors) {
  return {
    name: 'titles',
    titleConfig: { value: '订单中心' },
    titleConfigRight: { value: '更多' },
    buttonConfig: { tabVal: 0 },
    linkConfig: { value: '/pages/goods/order_list/index' },
    themeColor: { color: [{ item: '#333333' }] },
    buttonColor: { color: [{ item: '#999999' }] },
    fontSize: { val: 14 },
    buttonText: { val: 12 },
    textPosition: { tabVal: 0 },
    textStyle: { tabVal: 2 },
    fillet: { type: 0, val: 0 },
    ...colors,
  };
}

const cases = [
  ['legacy titleColor', { titleColor: { color: [{ item: '#123456' }, { item: '#abcdef' }] } }, '#123456', '#abcdef'],
  ['moduleColor takes precedence', {
    moduleColor: { color: [{ item: '#112233' }, { item: '#445566' }] },
    titleColor: { color: [{ item: '#123456' }, { item: '#abcdef' }] },
  }, '#112233', '#445566'],
  ['missing background', {}, '#fff', '#fff'],
  ['empty background colors', { moduleColor: { color: [] } }, '#fff', '#fff'],
  ['single background color', { moduleColor: { color: [{ item: '#123456' }] } }, '#123456', '#123456'],
];

for (const [name, colors, left, right] of cases) {
  test(`titles renders ${name}`, () => {
    const dataConfig = config(colors);
    const before = JSON.stringify(dataConfig);
    const errors = [];
    const previousHandler = Vue.config.errorHandler;
    Vue.config.errorHandler = (error) => errors.push(error.message);
    const instance = new Vue({ ...component, propsData: { dataConfig } });
    try {
      const tree = instance._render();
      assert.deepEqual(errors, [], 'render must not throw');
      assert.ok(tree.tag, 'title must render instead of an empty error node');
      assert.equal(instance.titleWrapStyle.background, `linear-gradient(90deg, ${left} 0%, ${right} 100%)`);
      assert.equal(instance.titleStyle.color, '#333333');
      assert.equal(instance.moreStyle.color, '#999999');
      assert.equal(JSON.stringify(dataConfig), before, 'render must not mutate saved configuration');
    } finally {
      instance.$destroy();
      Vue.config.errorHandler = previousHandler;
    }
  });
}
