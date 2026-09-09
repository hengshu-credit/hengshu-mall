// Temporary, randomly named probes live in the mounted source root, outside public.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fastcgi = require('./helpers/fastcgi.cjs');
const root = path.resolve(__dirname, '../../crmeb');
const prefix = '.dev-perf-' + randomUUID();
const entry = path.join(root, prefix + '.php');
const value = path.join(root, prefix + '-value.php');
const call = () => fastcgi({ SCRIPT_FILENAME: '/var/www/' + path.basename(entry), SCRIPT_NAME: '/' + path.basename(entry) }).then(JSON.parse);
function writeValue(text, age) {
  fs.writeFileSync(value, `<?php return '${text}';`);
  // Older distinct mtimes ensure the probe enters OPcache's compiled-script cache.
  const time = new Date(Date.now() - age);
  fs.utimesSync(value, time, time);
}
(async () => {
  try {
    fs.writeFileSync(entry, `<?php $file=__DIR__.'/${path.basename(value)}'; echo json_encode(['value'=>is_file($file) ? require $file : 'missing', 'cached'=>opcache_is_script_cached($file), 'timestamps'=>ini_get('opcache.validate_timestamps'), 'frequency'=>ini_get('opcache.revalidate_freq'), 'restriction'=>ini_get('open_basedir')]);`);
    writeValue('before', 10000);
    assert.equal((await call()).value, 'before');
    const warm = await call();
    assert.equal(warm.cached, true, 'Must exercise an actually cached source file');
    assert.equal(warm.timestamps, '1');
    assert.equal(warm.frequency, '0', 'Every request must check updated source');
    assert.equal(warm.restriction, '/tmp:/var:/dev/null');
    writeValue('after', 5000);
    assert.equal((await call()).value, 'after', 'Changed source must be visible on the next request');
    fs.unlinkSync(value);
    assert.equal((await call()).value, 'missing', 'Deleted source must not remain visible through OPcache');
    writeValue('recreated', 2500);
    assert.equal((await call()).value, 'recreated', 'Recreated source must be visible');
    console.log('PASS: cached PHP source changes, deletion and recreation; timestamp and filesystem protections retained');
  } finally {
    for (const file of [entry, value]) if (fs.existsSync(file)) fs.unlinkSync(file);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
