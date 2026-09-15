// Isolated Docker network: the real release Nginx routes images without PHP.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync, spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.build/app-loading-20260915');
const id = 'media-delivery-' + process.pid;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const names = [];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const imagePath = '/uploads/attach/2026/09/10/16fc5a7b33eb120e333f15fafd9faf05.avif';
const original = fs.readFileSync(path.join(root, '.build/storefront-audit/media', imagePath.slice('/uploads/'.length)));
async function verify(origin) {
  const imageUrl = origin + '/api/media/image?path=' + encodeURIComponent(imagePath);
  const results = [];
  let jpegTag;
  for (const [format, accept, mime] of [['', 'image/avif', 'image/png'], ['&format=auto', 'image/webp,*/*', 'image/jpeg'], ['&format=auto', 'image/avif,image/webp,*/*', 'image/avif'], ['&format=auto', 'image/avif;q=0,*/*', 'image/jpeg']]) {
    const started = performance.now();
    const response = await fetch(imageUrl + format, { headers: { Accept: accept } });
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), mime);
    assert.match(response.headers.get('vary'), /Accept/i);
    if (mime === 'image/avif') assert.equal(sha(bytes), sha(original), 'Original bytes must not be transformed');
    if (mime === 'image/png') assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    if (mime === 'image/jpeg') { assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff'); jpegTag = response.headers.get('etag'); }
    const conditional = await fetch(imageUrl + format, { headers: { Accept: accept, 'If-None-Match': response.headers.get('etag') } });
    assert.equal(conditional.status, 304); assert.equal((await conditional.arrayBuffer()).byteLength, 0);
    results.push({ mime, bytes: bytes.length, ms: Math.round(performance.now() - started) });
  }
  const different = await fetch(imageUrl + '&format=auto', { headers: { Accept: 'image/avif', 'If-None-Match': jpegTag } });
  assert.equal(different.status, 200, 'ETags cannot mix decoder variants'); await different.arrayBuffer();
  for (const suffix of ['path=/uploads/../private.avif', 'path=https://remote.test/a.avif', 'path=/uploads/a.png', 'path=/uploads/a.avif&format=svg']) {
    assert.equal((await fetch(origin + '/api/media/image?' + suffix)).status, 404);
  }
  return results;
}
(async () => {
  // Dedicated network, with loopback-only published ports for Windows clients.
  docker('network', 'create', id);
  let php, browser;
  try {
    const media = id + '-media';
    docker('run', '-d', '--name', media, '--network', id, '--network-alias', 'media-display', '--network-alias', 'phpfpm', '-p', '127.0.0.1:18139:8092', '--mount', 'type=bind,source=' + path.join(root, '.build/storefront-audit/media') + ',target=/media,readonly', 'crmeb-media-loading-test:20260915'); names.push(media);
    const nginx = id + '-nginx';
    docker('run', '-d', '--name', nginx, '--network', id, '-p', '127.0.0.1:18138:80', '--mount', 'type=bind,source=' + path.join(root, 'help/release/nginx.conf') + ',target=/etc/nginx/conf.d/default.conf,readonly', 'ccr.ccs.tencentyun.com/crmebky_php/nginx:v1.29.6'); names.push(nginx);
    docker('exec', nginx, 'nginx', '-t');
    for (let i = 0; i < 30; i++) {
      try { if ((await fetch('http://127.0.0.1:18139/health')).ok) break; } catch {}
      await pause(200);
    }
    const direct = await verify('http://127.0.0.1:18138');
    // Also exercise the PHP fallback used by installations with older Nginx.
    php = spawn(path.join(root, '.build/php74/php.exe'), ['-n', '-S', '127.0.0.1:18137', path.join(__dirname, 'commerce_media_router.php')], { env: { ...process.env, AUDIT_MEDIA_ORIGIN: 'http://127.0.0.1:18139' }, windowsHide: true, stdio: 'ignore' });
    await pause(400);
    const fallback = await verify('http://127.0.0.1:18137');
    const { chromium } = require(path.join(root, 'tests/tooling/node_modules/playwright'));
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    let imageRequest, responseType;
    page.on('request', request => { if (request.url().includes('/api/media/image')) imageRequest = request; });
    page.on('response', response => { if (response.url().includes('/api/media/image')) responseType = response.headers()['content-type']; });
    await page.setContent('<img id="product" style="width:300px" src="http://127.0.0.1:18138/api/media/image?path=' + encodeURIComponent(imagePath) + '&format=auto">');
    await page.waitForFunction(() => document.getElementById('product').naturalWidth === 1440);
    const requestedAccept = (await imageRequest.allHeaders()).accept;
    assert.match(requestedAccept, /image\/avif/); assert.equal(responseType, 'image/avif');
    await page.screenshot({ path: path.join(out, 'modern-browser-original.png') });
    fs.writeFileSync(path.join(out, 'delivery-results.json'), JSON.stringify({ direct, fallback, browser: { requestedAccept, responseType, width: 1440 } }, null, 2));
    console.log('PASS: real Nginx without PHP, PHP fallback, original AVIF byte identity, JPEG/PNG compatibility, Vary, variant ETags, path restrictions and Chrome decode');
    console.log(JSON.stringify({ direct, fallback }));
  } finally {
    if (browser) await browser.close();
    if (php) php.kill();
    for (const name of names.reverse()) docker('rm', '-f', name);
    docker('network', 'rm', id);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
