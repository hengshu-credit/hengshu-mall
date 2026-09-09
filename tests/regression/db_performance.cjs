// Profile read-only public API requests through the real PHP-FPM application.
// The random probe stays outside public and is removed even when a check fails.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const fastcgi = require('./helpers/fastcgi.cjs');
const root = path.resolve(__dirname, '../..');
const label = process.argv[2] || 'before';
assert.match(label, /^[a-z-]+$/);
const entry = path.join(root, 'crmeb', `.dev-db-${randomUUID()}.php`);
const targets = [
  '/api/products?page=1&limit=10&type=1&cid=1&sid=0',
  '/api/products?page=1&limit=10&type=1&cid=1&sid=9',
  '/api/products?page=1&limit=10&priceOrder=asc',
  '/api/category',
];
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
(async () => {
  const samples = [];
  try {
    fs.writeFileSync(entry, `<?php
$started = microtime(true);
define('DS', DIRECTORY_SEPARATOR);
// MultiApp derives the app name from the entry filename; mirror public/index.php.
$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/public/index.php';
chdir(__DIR__ . '/public');
require __DIR__ . '/vendor/autoload.php';
$app = new \\think\\App(__DIR__ . DIRECTORY_SEPARATOR);
$app->initialize();
$initialized = microtime(true);
$queries = [];
\\think\\facade\\Db::listen(function ($sql, $seconds) use (&$queries, $started) {
    if (strpos($sql, 'CONNECT:') !== 0) $queries[] = ['sql' => $sql, 'ms' => round($seconds * 1000, 3), 'at_ms' => round((microtime(true) - $started) * 1000, 3)];
});
$http = $app->http;
$response = $http->run();
$body = json_decode($response->getContent(), true);
$http->end($response);
header('Content-Type: application/json');
echo json_encode(['body' => $body, 'http_status' => $response->getCode(), 'init_ms' => round(($initialized - $started) * 1000, 3), 'total_ms' => round((microtime(true) - $started) * 1000, 3), 'queries' => $queries]);
`);
    for (const target of targets) {
      for (let run = 0; run < 3; run++) {
        const url = new URL(target, 'http://localhost:8011');
        const output = await fastcgi({ SCRIPT_FILENAME: '/var/www/' + path.basename(entry), SCRIPT_NAME: '/index.php', PHP_SELF: '/index.php', PATH_INFO: url.pathname, REQUEST_URI: target, QUERY_STRING: 's=' + encodeURIComponent(url.pathname) + '&' + url.search.slice(1), HTTP_HOST: 'localhost:8011', DOCUMENT_ROOT: '/var/www/public' });
        if (!output.trimStart().startsWith('{')) {
          fs.writeFileSync(path.join(root, 'help/dev/.state/db-probe-error.html'), output);
          throw new Error('Profiler returned HTML; inspect help/dev/.state/db-probe-error.html');
        }
        const result = JSON.parse(output);
        assert.equal(result.http_status, 200, target + ': ' + JSON.stringify(result.body));
        assert.equal(result.body.status, 200, target + ': ' + JSON.stringify(result.body));
        const hash = createHash('sha256').update(JSON.stringify(canonical(result.body))).digest('hex');
        const { body, ...profile } = result;
        samples.push({ target, run, hash, ...profile });
        console.log(JSON.stringify({ target, run, total_ms: profile.total_ms, init_ms: profile.init_ms, sql_ms: +profile.queries.reduce((sum, query) => sum + query.ms, 0).toFixed(3), queries: profile.queries.length, rows: body.data.length }));
      }
    }
    fs.writeFileSync(path.join(root, 'help/dev/.state', `db-${label}.json`), JSON.stringify(samples, null, 2));
    if (label === 'after') {
      const before = JSON.parse(fs.readFileSync(path.join(root, 'help/dev/.state/db-before.json')));
      for (const sample of samples) assert.equal(sample.hash, before.find(item => item.target === sample.target && item.run === sample.run).hash, `Response and ordering must remain identical: ${sample.target}`);
      console.log('PASS: complete API payloads and ordering match before index changes');
    }
  } finally { if (fs.existsSync(entry)) fs.unlinkSync(entry); }
})().catch(error => { console.error(error); process.exitCode = 1; });
