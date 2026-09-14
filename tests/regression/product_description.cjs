const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('../../template/admin/node_modules/jsdom');
const { root, transform, compiler } = require('./theme_component_harness.cjs');
function load(file) {
  const source = fs.readFileSync(file, 'utf8');
  const module = { exports: {} };
  new Function('module', 'exports', 'require', transform(source))(module, module.exports,
    name => load(path.resolve(path.dirname(file), name + '.js')));
  return module.exports;
}
const { fullWidthDescriptionImages } = load(path.join(root, 'template/shared/productDescription.js'));
const { formatRichText } = load(path.join(root, 'template/admin/src/utils/editorImg.js'));
const clientSource = compiler.parseComponent(fs.readFileSync(path.join(root, 'template/uni-app/subpackage/diyComponents/productDesc.vue'), 'utf8'));
const client = { exports: {} };
new Function('module', 'exports', 'require', transform(clientSource.script.content))(client, client.exports,
  name => name.includes('productDescription') ? { fullWidthDescriptionImages } : {});
const clientDescription = html => client.exports.default.computed.description.call({ productData: { description: html } });
const svg = (w, h) => 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#2962ff"/></svg>`).toString('base64');
const source = `<p>介绍 &amp; 参数</p><p style="margin:0;padding:0"><img src="${svg(990, 5000)}" width="990" height="5000" style="width:990px;height:1px;max-height:1px;object-fit:cover"></p>` +
  `<p style="margin:0;padding:0"><IMG src='${svg(100, 200)}' WIDTH=100 HEIGHT=1 style='width:100px;height:1px' data-width="native" alt="小图"></p>`;
for (const [label, html] of [
  ['editor save', formatRichText(source, true)],
  ['existing product display', clientDescription(source)],
  ['save and display', clientDescription(formatRichText(source, true))],
]) {
  const dom = new JSDOM(html);
  const images = [...dom.window.document.querySelectorAll('img')];
  assert.equal(images.length, 2);
  for (const img of images) {
    assert.equal(img.style.width, '100%', label);
    assert.equal(img.style.maxWidth, '100%', label);
    assert.equal(img.style.height, 'auto', label);
    assert.equal(img.style.maxHeight, 'none', label);
    assert.equal(img.style.display, 'block', label);
    assert.equal(img.hasAttribute('width'), false);
    assert.equal(img.hasAttribute('height'), false);
  }
  assert.equal(images[1].getAttribute('data-width'), 'native');
  assert.equal(dom.window.document.querySelector('p').textContent, '介绍 & 参数');
  dom.window.close();
}
assert.equal(fullWidthDescriptionImages(null), '');
assert.equal(fullWidthDescriptionImages(source), fullWidthDescriptionImages(fullWidthDescriptionImages(source)));
assert.equal(fullWidthDescriptionImages('<img alt="a > b" src="/test.png">').includes('alt="a > b"'), true);
assert(!formatRichText('<p style="width:990px;"><img src="/test.png"></p>').includes('max-max-width'));
const defaultDom = new JSDOM(formatRichText('<img src="/test.png">'));
assert(!defaultDom.window.document.querySelector('img').style.width, 'other editor users retain the default maximum width');
defaultDom.window.close();
assert(clientSource.template.content.includes(':html="description"'));
assert(clientSource.template.content.includes('v-html="description"'));
const parserFile = path.join(root, 'template/uni-app/components/jyf-parser/libs/MpHtmlParser.js');
function loadMini(file) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module, exports: module.exports,
    require: name => loadMini(path.resolve(path.dirname(file), name)),
    wx: { canIUse: () => true, getSystemInfoSync: () => ({ screenWidth: 375, system: 'iOS' }) },
  });
  return module.exports;
}
const MiniParser = loadMini(parserFile);
const nodes = new MiniParser(clientDescription(source), { tagStyle: client.exports.default.data().tagStyle }).parse();
const imageNodes = [];
function visit(items) {
  for (const node of items) {
    if (node.name === 'img') imageNodes.push(node);
    if (node.children) visit(node.children);
  }
}
visit(nodes);
assert.equal(imageNodes.length, 2);
for (const image of imageNodes) {
  assert.match(image.attrs.style, /(?:^|;)width:100%/);
  assert.match(image.attrs.style, /(?:^|;)height:auto/);
}
const output = path.join(root, '.build/jd-fix/description-layout.html');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, '<!doctype html><meta charset="utf-8"><style>body{margin:0}.container{overflow:hidden;width:100%;}</style><div class="container">' + clientDescription(formatRichText(source, true)) + '</div>');
console.log('PASS: description images retain full width and automatic height through editor save and existing-product H5/App/mini-program input');
