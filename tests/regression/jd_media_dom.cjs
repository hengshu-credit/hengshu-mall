const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('../../template/admin/node_modules/jsdom');
const root = path.resolve(__dirname, '../../services/jd-crawler/src/jd_crawler');
function run(file, method, html) {
  const code = fs.readFileSync(path.join(root, file), 'utf8').split(`def ${method}(`)[1].match(/r"""([\s\S]*?)"""/)[1];
  const dom = new JSDOM(html, { url: 'https://item.jd.com/100278221408.html', runScripts: 'outside-only' });
  try { return JSON.parse(dom.window.eval(`(function(){${code}})()`)); } finally { dom.window.close(); }
}
const host = 'https://img10.360buyimg.com';
const gallery = run('extractor.py', '_extract_native_gallery', `
<img id="spec-img" src="${host}/n5/s50x50_jfs/t1/product.jpg.avif" data-large="${host}/n0/jfs/t1/product.jpg.avif">
<div id="spec-list"><img src="${host}/n5/s50x50_jfs/t1/product.jpg.avif">
<img src="${host}/n5/jfs/t1/second.webp" srcset="${host}/n1/s200x200_jfs/t1/second.webp 200w, ${host}/n0/jfs/t1/second.webp 1600w"></div>`);
assert.deepEqual(gallery, [`${host}/n0/jfs/t1/product.jpg.avif`, `${host}/n0/jfs/t1/second.webp`]);
const details = run('vendor/cherrypainter_dom.py', '_extract_detail_images_by_js', `
<div class="recommend"><img src="${host}/imgzone/jfs/recommend.jpg"></div>
<div id="J-detail-content">
<img src="placeholder.gif" data-lazyload="${host}/imgzone/jfs/top.jpg.avif">
<div class="ssd-module" style="background-image:url(${host}/sku/jfs/middle.webp)"></div>
<img data-src="${host}/imgzone/jfs/bottom.jpg" src="placeholder.gif">
<img data-src="${host}/imgzone/jfs/bottom.jpg">
</div>`);
assert.deepEqual(details.map(image => image.url), [`${host}/imgzone/jfs/top.jpg.avif`, `${host}/sku/jfs/middle.webp`, `${host}/imgzone/jfs/bottom.jpg`]);
console.log('PASS: gallery chooses large observed sources and ordered details include lazy images/backgrounds');
// Execute the actual async quality-selection script with deterministic image-loading outcomes.
const probe = fs.readFileSync(path.join(root, 'extractor.py'), 'utf8').split('def _prefer_full_size_gallery(')[1].match(/r"""([\s\S]*?)"""/)[1];
const dimensions = { thumb: [50, 50], original: [1600, 1600], smaller: [25, 25], cropped: [1800, 30] };
class TestImage {
  set src(url) {
    if (!url) return;
    queueMicrotask(() => {
      if (!dimensions[url]) return this.onerror();
      [this.naturalWidth, this.naturalHeight] = dimensions[url];
      this.onload();
    });
  }
}
const quality = new Function('Image', 'pairs', 'return (function(){' + probe + '})(pairs)');
quality(TestImage, [['thumb', 'original'], ['thumb', 'missing'], ['thumb', 'smaller'], ['thumb', 'cropped'], ['thumb', null]])
  .then(result => {
    assert.deepEqual(result, ['original', 'thumb', 'thumb', 'thumb', 'thumb']);
    console.log('PASS: quality probe promotes larger originals and retains source on errors, shrinking or cropped dimensions');
  }).catch(error => { console.error(error); process.exitCode = 1; });
