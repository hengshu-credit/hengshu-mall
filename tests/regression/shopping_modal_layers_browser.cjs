// Render the real modal components against the native footer's competing layer.
// Production H5 manages navigation separately, so its normal tests missed this APP-PLUS overlap.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { root, modules, compiler, transform } = require('./theme_component_harness.cjs');
const styles = require(path.join(modules, '@vue/component-compiler-utils'));
const output = path.join(root, '.build/commerce-ui/screenshots');

function component(name) {
  const file = path.join(root, 'template/uni-app/components', name, 'index.vue');
  const sfc = compiler.parseComponent(fs.readFileSync(file, 'utf8'));
  const css = sfc.styles.map(style => {
    const result = styles.compileStyle({
      source: style.content, filename: file, id: '', scoped: false,
      preprocessLang: style.lang,
      preprocessOptions: { silenceDeprecations: ['legacy-js-api'] },
    });
    if (result.errors.length) throw result.errors[0];
    return result.code;
  }).join('\n').replace(/([\d.]+)rpx/g, (_, n) => Number(n) / 2 + 'px');
  // Uni-app view tags become ordinary HTML containers, not the browser's SVG <view>.
  const template = sfc.template.content
    .replace(/(<\/?)view(?=[\s>])/g, '$1div')
    .replace(/(<\/?)scroll-view(?=[\s>])/g, '$1div');
  return { name, template, script: transform(sfc.script.content), css };
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const name of ['productWindow', 'cartList']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const errors = [], source = component(name);
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent('<div id="app"></div>');
      await page.addScriptTag({ path: path.join(modules, 'vue/dist/vue.js') });
      await page.addStyleTag({ content: source.css + `
        .mask { position:fixed; inset:0; background:#0006; }
        .fixture-nav { position:fixed; left:0; right:0; bottom:0; height:52px; background:white; z-index:999; }
        .goodCate .mask { z-index:99; }
        .fixture-detail .mask { z-index:300!important; }
      ` });
      await page.evaluate(source => {
        Vue.prototype.$t = value => value;
        const module = { exports: {} };
        new Function('module', 'exports', 'require', source.script)(module, module.exports, () => ({}));
        const Modal = { ...module.exports.default, ...Vue.compile(source.template) };
        window.app = new Vue({
          data: { open: true, cartMode: 1 },
          render(h) {
            const props = source.name === 'productWindow'
              ? { attr: { cartAttr: this.open, productAttr: [], productSelect: { stock: 20, cart_num: 1, price: 99 } }, iScart: this.cartMode, iSplus: 1, isShow: 1 }
              : { cartData: { iScart: this.open, cartList: [] } };
            return h('div', { class: source.name === 'productWindow' ? 'fixture-detail' : 'goodCate' }, [
              h(Modal, { props }),
              // The native footer follows the page content in the render tree.
              h('div', { class: 'fixture-nav' }, '底部导航'),
            ]);
          },
        }).$mount('#app');
      }, source);
      await page.waitForFunction(name => {
        const panel = document.querySelector(name === 'productWindow' ? '.product-window.on' : '.cartList.on');
        return panel && panel.getBoundingClientRect().bottom <= innerHeight + 1;
      }, name);
      const hit = await page.evaluate(name => {
        const panel = document.querySelector(name === 'productWindow' ? '.product-window.on' : '.cartList.on');
        const mask = panel.parentElement.querySelector('.mask');
        const target = name === 'productWindow' ? panel.querySelector('.joinBnt') : panel;
        const rect = target.getBoundingClientRect();
        const front = document.elementFromPoint(innerWidth / 2, name === 'productWindow' ? rect.y + rect.height / 2 : innerHeight - 20);
        return {
          panel: panel === front || panel.contains(front),
          mask: mask === document.elementFromPoint(10, 100),
          interceptedBy: front && front.outerHTML.slice(0, 150),
        };
      }, name);
      await page.screenshot({ path: path.join(output, 'modal-layer-' + name + '.png') });
      assert.equal(hit.panel, true, name + ' must cover the native footer; hit: ' + hit.interceptedBy);
      assert.equal(hit.mask, true, name + ' backdrop must intercept background taps');
      if (name === 'productWindow') {
        await page.evaluate(async () => { app.cartMode = 0; await Vue.nextTick(); });
        assert.equal(await page.locator('.product-window-layer.is-open').count(), 0,
          'Activity dialogs that rely on the page purchase bar retain their existing layers');
      }
      await page.evaluate(async () => { app.open = false; await Vue.nextTick(); });
      assert.equal(await page.locator('.product-window-layer.is-open,.category-cart-layer.is-open').count(), 0,
        'Closing the dialog removes its covering layer');
      assert.deepEqual(errors, []);
      console.log('PASS shopping modal layer: ' + name);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
