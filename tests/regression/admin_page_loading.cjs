const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const admin = path.join(root, 'template/admin');
const babel = require(path.join(admin, 'node_modules/@babel/core'));
function load(file, imports) {
  let source = fs.readFileSync(path.join(admin, 'src', file), 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  const { code } = babel.transformSync(source, { babelrc: false, configFile: false,
    plugins: [require(path.join(admin, 'node_modules/@babel/plugin-transform-modules-commonjs'))] });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, console,
    require(id) {
      if (id === '@/utils/prefetchRead') return load('utils/prefetchRead.js', {});
      if (id === 'vuex') return { mapState: () => ({}), mapMutations: () => ({}) };
      return imports;
    } });
  return module.exports;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const cases = [
  ['user/label/index.vue', 'userLabelAll', 'userLabelApi', 'labelFrom', 'label_cate', 'labelLists', false],
  ['marketing/channelCode/channelCodeIndex.vue', 'wechatQrcodeTree', 'wechatQrcodeList', 'tableFrom', 'cate_id', 'tableList', true],
  ['setting/storeService/speechcraft.vue', 'speechcraftcate', 'wechatSpeechcraft', 'tableFrom', 'cate_id', 'tableList', true],
];
function fixture(entry) {
  const [file, categoryApi, listApi, form, field, list, nested] = entry;
  const categories = [], reads = [], errors = [];
  const component = load('pages/' + file, {
    [categoryApi]() { const d = deferred(); categories.push(d); return d.promise; },
    [listApi](params) { const d = deferred(); reads.push({ ...d, params: JSON.parse(JSON.stringify(params)) }); return d.promise; },
  }).default;
  const ctx = { [form]: { page: 2, limit: 15, [field]: 9, name: 'filter' }, [list]: [],
    labelSort: [], sortName: 9, loading: false, $message: { error: e => errors.push(e) } };
  for (const [name, fn] of Object.entries(component.methods)) ctx[name] = fn.bind(ctx);
  const categoryResult = () => ({ data: nested ? { data: [{ id: 8, name: 'category' }] } : [{ id: 8, name: 'category' }] });
  return { ctx, categories, reads, errors, categoryResult, form, field, list };
}
(async () => {
  for (const entry of cases) {
    for (const listFirst of [true, false]) {
      const f = fixture(entry);
      f.ctx.getUserLabelAll();
      assert.equal(f.categories.length, 1);
      assert.equal(f.reads.length, 1, entry[0] + ': list must start before category response');
      assert.deepEqual(f.reads[0].params, { page: 2, limit: 15, [f.field]: '', name: 'filter' });
      const result = { data: { list: [{ id: 1, name: 'result' }], count: 1 } };
      if (listFirst) {
        f.reads[0].resolve(result); await flush();
        assert.equal(f.ctx[f.list].length, 0, 'Keep category-dependent application order');
      }
      f.categories[0].resolve(f.categoryResult()); await flush();
      if (!listFirst) { assert.equal(f.ctx.loading, true); f.reads[0].resolve(result); }
      await flush();
      assert.equal(f.ctx[f.list][0].id, 1);
      assert.equal(f.ctx.labelSort[0].id, '');
      assert.equal(f.ctx.sortName, '');
      assert.equal(f.ctx.total, 1);
      assert.equal(f.ctx.loading, false);
      assert.equal(f.reads.length, 1, 'No second list read after categories');
      f.ctx.getList({ page: 2, limit: 15 });
      assert.equal(f.reads.length, 2, 'Manual refresh must request fresh data');
      f.reads[1].resolve(result); await flush();
    }
    {
      const f = fixture(entry);
      f.ctx.getUserLabelAll(1);
      assert.equal(f.reads.length, 0, 'Category-only edit must not fetch list');
      f.categories[0].resolve(f.categoryResult()); await flush();
      assert.equal(f.ctx.sortName, 9);
      assert.equal(f.ctx[f.form][f.field], 9);
    }
    {
      const f = fixture(entry);
      f.ctx.getUserLabelAll();
      f.reads[0].reject({ msg: 'list unavailable' }); await flush();
      assert.deepEqual(f.errors, [], 'Do not surface list failure before categories');
      f.categories[0].resolve(f.categoryResult()); await flush();
      assert.deepEqual(f.errors, ['list unavailable']);
      assert.equal(f.ctx.loading, false);
      f.ctx.getUserLabelAll();
      assert.equal(f.reads.length, 2, 'Retry must not reuse rejected request');
      f.categories[1].resolve(f.categoryResult());
      f.reads[1].resolve({ data: { list: [], count: 0 } }); await flush();
    }
    {
      const f = fixture(entry);
      const pending = f.ctx.getUserLabelAll();
      f.categories[0].reject(new Error('category unavailable'));
      await assert.rejects(pending, /category unavailable/);
      f.reads[0].reject(new Error('unused read')); await flush();
      assert.equal(f.ctx.sortName, 9);
      assert.equal(f.ctx[f.list].length, 0);
      assert.deepEqual(f.errors, []);
    }
    {
      const f = fixture(entry);
      f.ctx.getUserLabelAll();
      f.ctx[f.form].name = 'new filter';
      f.categories[0].resolve(f.categoryResult()); await flush();
      assert.equal(f.reads.length, 2, 'Changed filters must use a fresh matching request');
      assert.equal(f.reads[1].params.name, 'new filter');
      f.reads[1].resolve({ data: { list: [{ id: 2 }], count: 1 } }); await flush();
      f.reads[0].resolve({ data: { list: [{ id: 1 }], count: 1 } }); await flush();
      assert.equal(f.ctx[f.list][0].id, 2, 'Unused prefetch must not overwrite current filters');
    }
  }
  console.log('PASS: 3 admin pages; parallel reads, both response orders, unchanged filters/results, category-only edits, failures, retry and fresh reload');
})().catch(error => { console.error(error); process.exitCode = 1; });
