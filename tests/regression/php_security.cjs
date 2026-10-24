// Isolated engine/FPM checks. No mall configuration, database or network target.
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const image = process.argv[2] || 'hengshu-php:7.4.33-security-20261024';
const buildRoot = path.join(root, '.build');
fs.mkdirSync(buildRoot, {recursive: true});
const fixture = fs.mkdtempSync(path.join(buildRoot, 'php-security-test-'));
const name = 'php-security-test-' + crypto.randomUUID();
const docker = (...args) => cp.execFileSync('docker', args, {encoding: 'utf8', timeout: 60000});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function record(type, body) {
  const header = Buffer.alloc(8);
  header[0] = 1; header[1] = type; header.writeUInt16BE(1, 2); header.writeUInt16BE(body.length, 4);
  return Buffer.concat([header, body]);
}
function request(port, query = '', body = '', contentType = '') {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1');
    let buffer = Buffer.alloc(0), output = '', done = false;
    socket.setTimeout(10000, () => socket.destroy(new Error('FPM timeout')));
    socket.on('error', reject);
    socket.on('end', () => { if (!done) reject(new Error('FPM closed request')); });
    socket.on('connect', () => {
      const params = {REQUEST_METHOD: body ? 'POST' : 'GET', SCRIPT_FILENAME: '/var/www/security-fixture/index.php',
        SERVER_PROTOCOL: 'HTTP/1.1', SERVER_NAME: 'localhost', QUERY_STRING: query,
        CONTENT_TYPE: contentType, CONTENT_LENGTH: String(Buffer.byteLength(body))};
      const pairs = Object.entries(params).flatMap(([k, v]) => {
        assert(Buffer.byteLength(k) < 128 && Buffer.byteLength(v) < 128);
        return [Buffer.from([Buffer.byteLength(k), Buffer.byteLength(v)]), Buffer.from(k), Buffer.from(v)];
      });
      socket.write(Buffer.concat([record(1, Buffer.from([0,1,0,0,0,0,0,0])), record(4, Buffer.concat(pairs)),
        record(4, Buffer.alloc(0)), ...(body ? [record(5, Buffer.from(body))] : []), record(5, Buffer.alloc(0))]));
    });
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 8) {
        const size = buffer.readUInt16BE(4), padding = buffer[6], type = buffer[1];
        if (buffer.length < 8 + size + padding) break;
        const data = buffer.subarray(8, 8 + size);
        buffer = buffer.subarray(8 + size + padding);
        if (type === 6) output += data.toString();
        if (type === 3) { done = true; socket.end(); resolve(output.slice(output.indexOf('\r\n\r\n') + 4)); }
      }
    });
  });
}
(async () => {
  let started = false;
  try {
    const patch = fs.readFileSync(path.join(root, 'help/runtime/php/php-security.patch'));
    assert.equal(crypto.createHash('sha256').update(patch).digest('hex'), '5fe57ca6ee96d59b36c6e0ca842843c50884f177bef1e85234cf669b577f5e48');
    console.log(docker('run', '--rm', '--network', 'none', '--entrypoint', 'php', image, '-d', 'open_basedir=/usr/local', '/usr/local/lib/php-security/verify.php').trim());
    const oom = cp.spawnSync('docker', ['run', '--rm', '--network', 'none', '--memory', '128m', '--entrypoint', 'php', image,
      '-d', 'memory_limit=16M', '-r', 'register_shutdown_function(function(){echo "UNSAFE_SHUTDOWN";}); $x = str_repeat("x", 32*1024*1024);'], {encoding: 'utf8', timeout: 30000});
    assert.equal(oom.status, 1, 'official EOL patch terminates the process on OOM');
    assert.match(oom.stderr, /Allowed memory size/);
    assert(!oom.stdout.includes('UNSAFE_SHUTDOWN'), 'OOM must not run request cleanup');
    const disabled = cp.spawnSync('docker', ['run', '--rm', '--network', 'none', '--entrypoint', 'php', image,
      '-d', 'open_basedir=/usr/local', '-d', 'session.upload_progress.enabled=1', '/usr/local/lib/php-security/verify.php'], {encoding: 'utf8', timeout: 30000});
    assert.equal(disabled.status, 1, 'startup guard must reject unsafe configuration');
    console.log('PASS upstream patch hash, runtime binaries, extensions, OOM hard exit and fail-closed guard');
    fs.writeFileSync(path.join(fixture, 'fpm.conf'), `[global]\ndaemonize=no\nerror_log=/proc/self/fd/2\n[www]\nuser=www-data\ngroup=www-data\nlisten=0.0.0.0:9000\npm=static\npm.max_children=1\ncatch_workers_output=yes\n`);
    fs.writeFileSync(path.join(fixture, 'index.php'), `<?php
if (isset($_GET['oom'])) {
    ini_set('memory_limit', '16M');
    register_shutdown_function(function () {file_put_contents('/tmp/unsafe-shutdown', 'unsafe');});
    $x = str_repeat('x', 32*1024*1024);
}
session_start();
echo json_encode(['pid'=>getmypid(), 'version'=>PHP_VERSION, 'progress'=>ini_get('session.upload_progress.enabled'),
  'parts'=>ini_get('max_multipart_body_parts'), 'post'=>$_POST,
  'upload'=>isset($_FILES['upload']) ? file_get_contents($_FILES['upload']['tmp_name']) : null,
  'unsafe'=>file_exists('/tmp/unsafe-shutdown'), 'opcache'=>function_exists('opcache_get_status') && opcache_get_status() !== false]);
`);
    docker('run', '-d', '--name', name, '--memory', '256m', '--pids-limit', '64', '-p', '127.0.0.1::9000',
      '-v', fixture + ':/var/www/security-fixture:ro',
      '-v', path.join(root, 'help/release/php.ini') + ':/usr/local/etc/php/conf.d/zz-release.ini:ro',
      '--entrypoint', 'php-fpm', image, '-F', '-y', '/var/www/security-fixture/fpm.conf');
    started = true;
    const info = JSON.parse(docker('inspect', name))[0];
    const port = Number(info.NetworkSettings.Ports['9000/tcp'][0].HostPort);
    let baseline;
    for (let n = 0; n < 30; n++) {
      try { baseline = JSON.parse(await request(port)); break; } catch (e) { if (n === 29) throw e; await delay(200); }
    }
    assert.equal(baseline.version, '7.4.33'); assert.equal(baseline.progress, '0'); assert.equal(baseline.parts, '-1');
    assert.equal(baseline.opcache, true, 'release OPcache must work with the patched engine');
    const body = '--boundary\r\nContent-Disposition: form-data; name="item"\r\n\r\nfixture\r\n' +
      '--boundary\r\nContent-Disposition: form-data; name="upload"; filename="sample.txt"\r\nContent-Type: text/plain\r\n\r\nhello\r\n--boundary--\r\n';
    const upload = JSON.parse(await request(port, '', body, 'multipart/form-data; boundary=boundary'));
    assert.equal(upload.post.item, 'fixture'); assert.equal(upload.upload, 'hello'); assert.equal(upload.pid, baseline.pid);
    try { await request(port, 'oom=1'); } catch (e) { assert.match(e.message, /FPM closed request|ECONNRESET/); }
    let recovered;
    for (let n = 0; n < 30; n++) {
      try { recovered = JSON.parse(await request(port)); break; } catch (e) { if (n === 29) throw e; await delay(200); }
    }
    assert.notEqual(recovered.pid, baseline.pid); assert.equal(recovered.unsafe, false);
    console.log('PASS real FPM startup, reused worker, sessions, multipart upload, OOM worker replacement and request recovery');
  } finally {
    if (started) docker('rm', '-f', name);
    if (path.dirname(fixture) !== buildRoot || !path.basename(fixture).startsWith('php-security-test-')) throw Error('Unexpected fixture cleanup path');
    fs.rmSync(fixture, {recursive: true, force: true});
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
