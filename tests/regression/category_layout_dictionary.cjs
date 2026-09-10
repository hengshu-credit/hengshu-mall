const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {root, transform} = require('./theme_component_harness.cjs');
function shared(name) {
  const module = {exports:{}};
  new Function('module','exports','require',transform(fs.readFileSync(path.join(root,'template/shared',name+'.js'),'utf8')))(module,module.exports,id=>shared(id.replace('./','')));
  return module.exports;
}
const {normalizeCategoryPage} = shared('categoryPageConfig');
const config = normalizeCategoryPage({status:1,layout_configs:[]});
assert.equal(Array.isArray(config.layout_configs), false, 'PHP empty arrays must become layout dictionaries');
config.layout_configs[1] = {status:1};
assert.deepEqual(JSON.parse(JSON.stringify(config.layout_configs)), {'1':{status:1}}, 'saving a switched layout cannot introduce a null index zero');
const legacy = normalizeCategoryPage({layout_configs:[null,{status:1},null,{status:3}]});
assert.deepEqual(legacy.layout_configs, {'1':{status:1},'3':{status:3}});
console.log('PASS category layout dictionary: empty PHP arrays and sparse legacy arrays serialize by layout ID');
