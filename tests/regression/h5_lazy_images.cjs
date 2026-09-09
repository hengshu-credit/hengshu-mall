const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const babel = require(path.join(root, 'template/admin/node_modules/@babel/core'));
const { preprocess } = require(path.join(root, 'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
let queries = 0;
let imageTop = 1800, platform = { H5: true }, nativeObserver;
const listeners = new Set(), observers = [];
class Observer {
  constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
  observe(target) { this.targets.add(target); }
  unobserve(target) { this.targets.delete(target); }
  disconnect() { this.targets.clear(); }
}
const uni = {
  $on: (name, fn) => listeners.add(fn), $off: (name, fn) => listeners.delete(fn), getWindowInfo: () => ({ windowHeight: 800 }),
  createSelectorQuery() { queries++; return { in() { return this; }, select() { return this; }, boundingClientRect(fn) { fn({ top: imageTop }); return this; }, exec() {} }; },
};
let visibility;
function load(file) {
  let source = fs.readFileSync(path.join(root, 'template/uni-app', file), 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  source = preprocess(source, platform, { type: 'js' });
  const { code } = babel.transformSync(source, { babelrc: false, configFile: false, plugins: [require(path.join(root, 'template/admin/node_modules/@babel/plugin-transform-modules-commonjs'))] });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, IntersectionObserver: nativeObserver, uni, setTimeout, clearTimeout,
    require: id => id.includes('imageVisibility') ? (visibility ||= load('utils/imageVisibility.js')) : { Throttle: fn => fn },
  });
  return module.exports;
}
nativeObserver = Observer;
const options = load('components/easy-loadimage/easy-loadimage.vue').default;
function mountImage(options) {
  const image = { $el: {}, imageSrc: '/example.png', viewHeight: 800, $nextTick(fn) { fn.call(this); } };
  Object.assign(image, options.data.call(image));
  for (const [key, method] of Object.entries(options.methods)) image[key] = method.bind(image);
  options.mounted.call(image);
  return image;
}
const images = Array.from({ length: 80 }, () => mountImage(options));
try {
  for (let i = 0; i < 60; i++) for (const fn of [...listeners]) fn();
  assert.equal(queries, 0, 'Native H5 visibility must avoid per-image layout reads on every scroll');
  assert.equal(observers.length, 1, 'Images should share one visibility observer');
  assert.equal(listeners.size, 0, 'Native H5 images should not register global scroll handlers');
  assert.equal(images[0].loadImg, false);
  observers[0].callback([{ target: images[0].$el, isIntersecting: true }]);
  assert.equal(images[0].loadImg, true);
  assert.equal(images[1].loadImg, false, 'Offscreen images should remain lazy');
  assert.equal(observers[0].targets.has(images[0].$el), false);
  images[0].handleImgLoad();
  assert.equal(images[0].showImg, true);
  images[0].imageSrc = '/replacement.png';
  options.watch.imageSrc.call(images[0]);
  assert.equal(images[0].showImg, false, 'A replacement image must stay hidden until its own load event');
  assert.equal(images[0].showTransition, false, 'Replacement images must reset the fade-in');
  images[0].handleImgLoad();
  images[0].borderLoaded = 1;
  options.watch.borderSrc.call(images[0]);
  assert.equal(images[0].borderLoaded, 0, 'A replacement decoration must wait for its own load event');
  options.beforeDestroy.call(images[1]); images[1]._isDestroyed = true;
  observers[0].callback([{ target: images[1].$el, isIntersecting: true }]);
  assert.equal(images[1].loadImg, false, 'Detached images must not respond to queued visibility entries');
  images[0].handleImgError();
  assert.equal(images[0].isLoadError, true);
  assert.equal(images[0].showImg, false, 'A failed image must stop displaying');
  assert.equal(images[0].borderLoaded, 0, 'Removed decorations must wait for loading again');
  images[0].imageSrc = '';
  options.watch.imageSrc.call(images[0]);
  assert.equal(images[0].loadImg, false, 'Empty sources must not mount a native image');
  assert.equal(images[0].isLoadError, true);
  images[0].imageSrc = '/retry.png';
  options.watch.imageSrc.call(images[0]);
  observers[0].callback([{ target: images[0].$el, isIntersecting: true }]);
  assert.equal(images[0].loadImg, true, 'A new valid source must recover from an empty source');
  assert.equal(images[0].isLoadError, false);
  assert.equal(images[0].showImg, false, 'Recovery must still await the new load event');
  console.log('PASS: 80 lazy images share one observer, zero scroll layout queries, visibility and disposal preserved');
} finally { for (const image of images) options.beforeDestroy.call(image); }
for (const flags of [{ H5: true }, { MP: true, MP_WEIXIN: true }, { APP_PLUS: true }]) {
  platform = flags; nativeObserver = undefined; visibility = undefined; imageTop = 1800;
  const fallback = load('components/easy-loadimage/easy-loadimage.vue').default;
  const image = mountImage(fallback);
  try {
    assert.equal(image.loadImg, false);
    assert.equal(listeners.size, 1, 'Unsupported browsers and non-H5 platforms must retain scroll fallback');
    imageTop = 300;
    for (const fn of [...listeners]) fn();
    assert.equal(image.loadImg, true, 'Fallback must load images entering the viewport');
    assert.equal(listeners.size, 0, 'Loaded images must stop observing scroll');
  } finally { fallback.beforeDestroy.call(image); }
}
console.log('PASS: H5 without IntersectionObserver, mini-program and App fallback visibility');
