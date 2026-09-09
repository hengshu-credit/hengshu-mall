// Execution plans for the existing category and language lookup patterns.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { query } = require('../../help/dev/db-indexes.cjs');
const label = process.argv[2] || 'after';
assert.match(label, /^[a-z-]+$/);
const cases = [
  { name: 'category-products', sql: 'SELECT product_id FROM eb_store_product_cate WHERE cate_id=10', index: 'idx_cate_product' },
  { name: 'product-categories', sql: 'SELECT cate_id FROM eb_store_product_cate WHERE product_id=1', index: 'idx_product_cate' },
  { name: 'translation-key', sql: "SELECT lang_explain FROM eb_lang_code WHERE code='100000' AND type_id=1", index: 'idx_code_type' },
  { name: 'translation-page', sql: 'SELECT * FROM eb_lang_code WHERE type_id=1 AND is_admin=1 ORDER BY id DESC LIMIT 20', index: 'idx_type_admin_id' },
];
const result = cases.map(item => {
  const plan = query('EXPLAIN FORMAT=JSON ' + item.sql);
  const analyze = query('EXPLAIN ANALYZE ' + item.sql);
  if (label === 'after') assert.match(plan, new RegExp(`"key": "${item.index}"`), item.name + ' must use its index');
  console.log(item.name + '\n' + analyze.trim());
  return { ...item, plan: JSON.parse(plan), analyze };
});
fs.writeFileSync(path.resolve(__dirname, '../../help/dev/.state', `db-index-${label}.json`), JSON.stringify(result, null, 2));
console.log('PASS: category and language lookup plans captured' + (label === 'after' ? ', expected indexes selected' : ''));
