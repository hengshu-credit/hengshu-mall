// Read-only diagnosis: time Composer autoloading and optionally replay its class map.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const fastcgi = require('./helpers/fastcgi.cjs');
const root = path.resolve(__dirname, '../..');
const entry = path.join(root, 'crmeb', `.dev-runtime-${randomUUID()}.php`);
const target = '/api/products?page=1&limit=10&type=1&cid=1&sid=0';
(async () => {
  let classMap = {};
  const samples = [];
  try {
    for (const mode of ['baseline', 'classmap']) {
      const map = Buffer.from(JSON.stringify(mode === 'classmap' ? classMap : {})).toString('base64');
      fs.writeFileSync(entry, `<?php
$started = microtime(true);
define('DS', DIRECTORY_SEPARATOR);
$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/public/index.php';
chdir(__DIR__ . '/public');
$loader = require __DIR__ . '/vendor/autoload.php';
$loader->addClassMap(json_decode(base64_decode('${map}'), true));
$spans = []; $stack = [];
spl_autoload_unregister([$loader, 'loadClass']);
spl_autoload_register(function ($class) use ($loader, &$spans, &$stack) {
    $start = microtime(true); $stack[] = 0;
    try { return $loader->loadClass($class); }
    finally {
        $elapsed = (microtime(true) - $start) * 1000; $child = array_pop($stack);
        if (count($stack)) $stack[count($stack) - 1] += $elapsed;
        $spans[] = ['class' => $class, 'total_ms' => round($elapsed, 3), 'self_ms' => round($elapsed - $child, 3)];
    }
}, true, true);
$app = new \\think\\App(__DIR__ . DIRECTORY_SEPARATOR);
$http = $app->http; $response = $http->run();
$body = json_decode($response->getContent(), true); $http->end($response);
$total = (microtime(true) - $started) * 1000;
$classMap = [];
foreach (array_merge(get_declared_classes(), get_declared_interfaces(), get_declared_traits()) as $name) {
    $reflection = new ReflectionClass($name);
    if ($reflection->getFileName()) $classMap[$name] = $reflection->getFileName();
}
echo json_encode(['body' => $body, 'total_ms' => round($total, 3), 'spans' => $spans, 'classMap' => $classMap]);
`);
      for (let run = 0; run < 3; run++) {
        const url = new URL(target, 'http://localhost:8011');
        const output = await fastcgi({ SCRIPT_FILENAME: '/var/www/' + path.basename(entry), SCRIPT_NAME: '/index.php', PHP_SELF: '/index.php', REQUEST_URI: target, QUERY_STRING: 's=' + encodeURIComponent(url.pathname) + '&' + url.search.slice(1), HTTP_HOST: 'localhost:8011', DOCUMENT_ROOT: '/var/www/public' });
        const result = JSON.parse(output);
        assert.equal(result.body.status, 200);
        classMap = { ...classMap, ...result.classMap };
        const { body, classMap: ignored, ...profile } = result;
        const sample = { mode, run, hash: createHash('sha256').update(JSON.stringify(body)).digest('hex'), ...profile };
        samples.push(sample);
        console.log(JSON.stringify({ mode, run, total_ms: profile.total_ms, autoload_ms: +profile.spans.reduce((sum, span) => sum + span.self_ms, 0).toFixed(3), loads: profile.spans.length }));
      }
    }
    for (const sample of samples) assert.equal(sample.hash, samples[0].hash, 'Experimental classmap must preserve the entire response');
    fs.writeFileSync(path.join(root, 'help/dev/.state/php-runtime-profile.json'), JSON.stringify(samples, null, 2));
    console.log('PASS: baseline and experimental classmap produce identical responses');
  } finally { if (fs.existsSync(entry)) fs.unlinkSync(entry); }
})().catch(error => { console.error(error); process.exitCode = 1; });
