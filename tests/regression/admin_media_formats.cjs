const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const admin = path.join(root, 'template/admin');
const babel = require(path.join(admin, 'node_modules/@babel/core'));
const transformModules = require(path.join(admin, 'node_modules/@babel/plugin-transform-modules-commonjs'));
const compiler = require(path.join(admin, 'node_modules/vue-template-compiler'));

function loadUtils() {
  const source = fs.readFileSync(path.join(admin, 'src/utils/index.js'), 'utf8');
  const { code } = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [transformModules],
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(id) {
      if (id === 'element-ui') return { Message: { error() {} } };
      return require(id);
    },
  }, { filename: 'utils/index.js' });
  return module.exports;
}

function read(relativePath) {
  return fs.readFileSync(path.join(admin, 'src', relativePath), 'utf8');
}

function validateVue(relativePath, source) {
  const scriptStart = source.indexOf('<script');
  const template = source.slice(source.indexOf('<template>') + '<template>'.length, source.lastIndexOf('</template>', scriptStart));
  const script = source.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(compiler.compile(template).errors, [], `${relativePath} template must compile`);
  babel.transformSync(script, { babelrc: false, configFile: false, plugins: [transformModules] });
}

const utils = loadUtils();
const images = [
  ['photo.jpg', 'image/jpeg'],
  ['photo.JPEG', 'image/jpeg'],
  ['photo.png', 'image/png'],
  ['photo.gif', 'image/gif'],
  ['photo.webp', 'image/webp'],
  ['photo.avif', 'image/avif'],
  ['vector.svg', 'image/svg+xml'],
  ['legacy.bmp', 'image/bmp'],
  ['favicon.ico', 'image/vnd.microsoft.icon'],
];
for (const [name, type] of images) {
  assert.equal(utils.isPicUpload({ name, type }), true, `${name} should be accepted as an image`);
  assert.ok(utils.IMAGE_UPLOAD_ACCEPT.includes(`.${name.split('.').pop().toLowerCase()}`));
  assert.ok(utils.IMAGE_UPLOAD_MIME_TYPES.includes(type));
}

const videos = [
  ['clip.mp4', 'video/mp4'],
  ['clip.WEBM', 'video/webm'],
  ['clip.mov', 'video/quicktime'],
  ['clip.m4v', 'video/x-m4v'],
  ['clip.ogv', 'video/ogg'],
  ['clip.avi', 'video/x-msvideo'],
  ['clip.wmv', 'video/x-ms-wmv'],
  ['clip.rm', 'application/vnd.rn-realmedia'],
  ['clip.mpg', 'video/mpeg'],
  ['clip.mpeg', 'video/mpeg'],
  ['clip.flv', 'video/x-flv'],
];
for (const [name, type] of videos) {
  assert.equal(utils.isVideoUpload({ name, type }), true, `${name} should be accepted as a video`);
  assert.ok(utils.VIDEO_UPLOAD_ACCEPT.includes(`.${name.split('.').pop().toLowerCase()}`));
  assert.ok(utils.VIDEO_UPLOAD_MIME_TYPES.includes(type));
}

assert.equal(utils.isPicUpload({ name: 'fake.jpg', type: 'video/mp4' }), false, 'MIME mismatches must be rejected');
assert.equal(utils.isVideoUpload({ name: 'stream.m3u8', type: 'application/vnd.apple.mpegurl' }), false);
assert.equal(utils.isVideoUpload({ name: 'stream.m3u8', type: 'video/mp4' }), false, 'HLS playlists are links, not direct video files');
assert.equal(utils.isVideoUpload({ name: 'legacy.swf', type: 'application/x-shockwave-flash' }), false, 'Flash is not a product video');

const uploadImg = read('components/uploadImg/index.vue');
validateVue('components/uploadImg/index.vue', uploadImg);
assert.match(uploadImg, /:accept="imageUploadAccept"/);
assert.match(uploadImg, /IMAGE_UPLOAD_ACCEPT/);
assert.doesNotMatch(uploadImg, /compressImg|canvas|toDataURL/, 'Image uploads must retain their original bytes');
assert.match(uploadImg, /jpg、jpeg、png、gif、webp、avif、svg、bmp、ico/);

for (const relativePath of ['components/uploadVideo2/index.vue', 'components/uploadVideo/index.vue']) {
  const source = read(relativePath);
  validateVue(relativePath, source);
  assert.match(source, /:accept="videoUploadAccept"/);
  assert.match(source, /VIDEO_UPLOAD_ACCEPT/);
  assert.match(source, /isVideoUpload\(file\)/);
  assert.doesNotMatch(source, /type\s*!==\s*['"]video\/mp4['"]/);
  assert.match(source, /m3u8[\s\S]*链接/i);
  assert.match(source, /预览.*浏览器.*编码/);
  assert.match(source, /<video[\s\S]*?:src=/, `${relativePath} must preview direct video files with a video element`);
}

const materialLibrary = read('pages/system/file/index.vue');
const editor = read('components/wangEditor/index.vue');
const product = read('pages/product/productAdd/index.vue');
assert.match(materialLibrary, /components\/uploadPictures\/index/);
assert.match(materialLibrary, /components\/uploadVideo2\/index/);
assert.match(editor, /components\/uploadPictures/);
assert.match(editor, /components\/uploadVideo2/);
assert.match(product, /\$videoModal/);
assert.doesNotMatch(product, /imageMogr|x-oss-process|imageView|toDataURL/, 'Collection backfill must not rewrite media URLs');

console.log('PASS: admin image/video format, MIME, accept and preview coverage');
