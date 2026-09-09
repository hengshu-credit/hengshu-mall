const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function setup() {
  let completeRequest;
  const filename = path.resolve(__dirname, '../../template/uni-app/subpackage/diyComponents/goodList.vue');
  const script = fs.readFileSync(filename, 'utf8').split('<script>')[1].split('</script>')[0];
  const component = vm.runInNewContext(script.replace(/^import .*;$/gm, '')
    .replace('export default', 'module.exports ='), {
    module: { exports: {} }, skuSelect: {}, productWindow: {}, commonWrapper: {},
    mapGetters: () => ({}), mapState: () => ({}),
    getProductslist: () => new Promise(resolve => { completeRequest = resolve; }),
  }, { filename });
  const state = { list: [], tempArr: [], $config: { LIMIT: 20 },
    typeConfig: 3, goodsSort: 0, numberConfig: 12, dataConfig: { classList: { classVal: [] } } };
  return { component, state, complete: data => completeRequest({ data }) };
}

test('late category response must not erase product-detail recommendations', async () => {
  const { component, state, complete } = setup();
  component.methods.productslist.call(state);
  state.list = [{ id: 1, store_name: 'Configured recommendation' }];
  component.watch.list.handler.call(state, state.list);
  complete([]);
  await Promise.resolve();
  assert.deepEqual(state.tempArr.map(item => item.id), [1]);
});

test('standalone category widget still displays its fetched products', async () => {
  const { component, state, complete } = setup();
  component.methods.productslist.call(state);
  complete([{ id: 3, store_name: 'Category product' }]);
  await Promise.resolve();
  assert.deepEqual(state.tempArr.map(item => item.id), [3]);
});
