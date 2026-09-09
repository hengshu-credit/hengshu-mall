// Local CRMEB index migration. Existing indexes and business rows are preserved.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const state = path.join(__dirname, '.state');
const manifest = path.join(state, 'db-indexes-applied.json');
const indexes = [
  { table: 'eb_store_product_cate', name: 'idx_cate_product', columns: ['cate_id', 'product_id'] },
  { table: 'eb_store_product_cate', name: 'idx_product_cate', columns: ['product_id', 'cate_id'] },
  { table: 'eb_lang_code', name: 'idx_code_type', columns: ['code', 'type_id'] },
  { table: 'eb_lang_code', name: 'idx_type_admin_id', columns: ['type_id', 'is_admin', 'id'] },
];
function docker(command, input = '') {
  return execFileSync('docker', ['exec', '-i', 'crmeb_mysql', 'sh', '-lc', command], { input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}
function query(sql) {
  return docker('MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --default-character-set=utf8mb4 --batch --raw --skip-column-names crmeb', sql);
}
function currentIndexes(table) {
  return query(`SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='crmeb' AND TABLE_NAME='${table}' GROUP BY INDEX_NAME;`)
    .trim().split('\n').filter(Boolean).map(line => { const [name, columns] = line.split('\t'); return { name, columns: columns.split(',') }; });
}
function matches(actual, expected) {
  return expected.columns.every((column, i) => actual.columns[i] === column);
}
function dataHash(table) {
  // Sort by the unchanged primary key so a different access path cannot alter the hash.
  return createHash('sha256').update(query(`SELECT * FROM \`${table}\` ORDER BY id;`)).digest('hex');
}
function apply() {
  fs.mkdirSync(state, { recursive: true });
  const tables = [...new Set(indexes.map(index => index.table))];
  const backup = path.join(state, `db-index-schema-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
  fs.writeFileSync(backup, docker('MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --default-character-set=utf8mb4 --no-data --skip-comments --set-gtid-purged=OFF crmeb ' + tables.join(' ')));
  const before = Object.fromEntries(tables.map(table => [table, dataHash(table)]));
  const owned = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest)).indexes : [];
  for (const table of tables) {
    const existing = currentIndexes(table);
    const pending = indexes.filter(index => index.table === table && !existing.some(actual => matches(actual, index)));
    for (const index of pending) {
      if (existing.some(actual => actual.name === index.name)) throw new Error(`Conflicting index definition: ${table}.${index.name}`);
    }
    if (!pending.length) { console.log(`SKIP: ${table} already has equivalent indexes`); continue; }
    const clauses = pending.map(index => `ADD INDEX \`${index.name}\` (${index.columns.map(column => `\`${column}\``).join(',')})`);
    // Fail on a lock conflict instead of falling back to a blocking table copy.
    query(`SET SESSION lock_wait_timeout=5; ALTER TABLE \`${table}\` ${clauses.join(', ')}, ALGORITHM=INPLACE, LOCK=NONE;`);
    for (const index of pending) if (!owned.some(item => item.table === table && item.name === index.name)) owned.push(index);
    fs.writeFileSync(manifest, JSON.stringify({ backup, indexes: owned }, null, 2));
    console.log(`ADDED: ${table}: ${pending.map(index => index.name).join(', ')}`);
  }
  for (const table of tables) {
    if (dataHash(table) !== before[table]) throw new Error(`Rows changed during migration: ${table}; check concurrent edits before accepting validation`);
  }
  console.log('PASS: all indexed table rows are byte-identical in primary-key order');
  console.log('Schema backup: ' + backup);
}
function rollback() {
  if (!fs.existsSync(manifest)) throw new Error('No local migration ownership record; refusing to remove pre-existing indexes');
  const record = JSON.parse(fs.readFileSync(manifest));
  for (const index of [...record.indexes]) {
    if (!indexes.some(expected => expected.table === index.table && expected.name === index.name && JSON.stringify(expected.columns) === JSON.stringify(index.columns))) throw new Error('Unknown index in local ownership record');
    const actual = currentIndexes(index.table).find(item => item.name === index.name);
    if (actual && (!matches(actual, index) || actual.columns.length !== index.columns.length)) throw new Error(`Index changed since migration: ${index.name}`);
    if (actual) query(`SET SESSION lock_wait_timeout=5; ALTER TABLE \`${index.table}\` DROP INDEX \`${index.name}\`, ALGORITHM=INPLACE, LOCK=NONE;`);
    record.indexes = record.indexes.filter(item => item.table !== index.table || item.name !== index.name);
    fs.writeFileSync(manifest, JSON.stringify(record, null, 2));
    console.log('REMOVED: ' + index.table + '.' + index.name);
  }
}
module.exports = { query, indexes, currentIndexes };
if (require.main === module) {
  try {
    const action = (process.argv[2] || 'status').toLowerCase();
    if (action === 'apply') apply();
    else if (action === 'rollback') rollback();
    else if (action === 'status') {
      for (const index of indexes) console.log(`${index.table}.${index.name} (${index.columns.join(', ')}) ${currentIndexes(index.table).some(actual => matches(actual, index)) ? 'covered' : 'missing'}`);
    } else throw new Error('Usage: node help/dev/db-indexes.cjs status|apply|rollback');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
