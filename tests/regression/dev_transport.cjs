const http = require('node:http');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
function get(url, encoding) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { headers: { 'Accept-Encoding': encoding } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(30000, () => request.destroy(new Error('Response timeout')));
  });
}
(async () => {
  for (const url of ['http://localhost:8011/admin/app.js', 'http://localhost:1617/admin/app.js', 'http://localhost:8011/static/js/index.js', 'http://localhost:8011/api/theme_info/home']) {
    const plain = await get(url, 'identity');
    const zipped = await get(url, 'gzip');
    assert.equal(plain.status, 200);
    assert.equal(zipped.status, 200);
    assert.equal(zipped.headers['content-encoding'], 'gzip');
    assert.match(zipped.headers.vary, /accept-encoding/i);
    assert.ok(plain.body.equals(zlib.gunzipSync(zipped.body)), 'Compression must preserve every response byte: ' + url);
    assert.ok(zipped.body.length < plain.body.length * 0.5, 'Text transfer size should be materially reduced');
    console.log(`PASS: ${url} ${plain.body.length} -> ${zipped.body.length} bytes, identical decoded content`);
  }
  const map = await get('http://localhost:8011/admin/app.js.map', 'identity');
  assert.equal(map.status, 200);
  const sourceMap = JSON.parse(map.body);
  assert.ok(sourceMap.sources.some(source => source.includes('src/main.js')));
  assert.ok(sourceMap.sourcesContent.some(source => source && source.includes('Vue.prototype.$config')));
  console.log('PASS: separate admin source map preserves original source debugging');
})().catch(error => { console.error(error); process.exitCode = 1; });
