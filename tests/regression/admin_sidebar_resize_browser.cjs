const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const modules = path.join(root, 'template/admin/node_modules');
const source = path.join(root, 'template/admin/src');
const babel = require(path.join(modules, '@babel/core'));
const compiler = require(path.join(modules, 'vue-template-compiler'));
const sass = require(path.join(modules, 'sass'));
const files = {};
const styles = [];

function collect(name) {
  if (files[name]) return;
  const filename = path.join(source, name.slice(2));
  const content = fs.readFileSync(filename, 'utf8');
  const sfc = name.endsWith('.vue') ? compiler.parseComponent(content) : null;
  const script = sfc ? sfc.script.content : content;
  files[name] = {
    script: babel.transformSync(script, {
      babelrc: false,
      configFile: false,
      plugins: [require(path.join(modules, '@babel/plugin-transform-modules-commonjs'))],
    }).code,
    template: sfc && sfc.template.content,
  };
  if (sfc)
    for (const style of sfc.styles) {
      styles.push(
        sass
          .renderSync({
            data: style.content,
            silenceDeprecations: ['legacy-js-api'],
            logger: sass.Logger.silent,
          })
          .css.toString(),
      );
    }
  for (const match of script.matchAll(/from ['"](@\/[^'"]+)['"]/g)) {
    if (
      /^@\/(layout\/(component\/(aside|columnsAside|sidebarResize|sidebarResizer)|navMenu|logo)|utils\/storage)/.test(
        match[1],
      )
    )
      collect(match[1]);
  }
}

['defaults', 'classic', 'columns', 'transverse'].forEach((layout) => collect(`@/layout/main/${layout}.vue`));
collect('@/store/module/themeConfig.js');
styles.unshift(
  sass
    .renderSync({
      file: path.join(source, 'theme/index.scss'),
      silenceDeprecations: ['legacy-js-api'],
      logger: sass.Logger.silent,
    })
    .css.toString(),
);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /Vue warn|Error in|TypeError/.test(message.text())) errors.push(message.text());
    });
    await page.route('http://sidebar.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<div id="app"></div>' }),
    );

    async function mount(layout, restore = false) {
      await page.goto('http://sidebar.test/');
      for (const file of ['vue/dist/vue.js', 'vuex/dist/vuex.js', 'element-ui/lib/index.js']) {
        await page.addScriptTag({ path: path.join(modules, file) });
      }
      await page.addStyleTag({
        path: path.join(modules, 'element-ui/lib/theme-chalk/index.css'),
      });
      await page.addStyleTag({ content: styles.join('\n') });
      await page.evaluate(
        ({ files, layout, restore }) => {
          const cache = {};
          const logo =
            'data:image/svg+xml,' +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#22d3ee"/></svg>',
            );
          const mocks = {
            '../../package.json': { name: 'from-crmeb-admin' },
            vuex: Vuex,
            '@/api/common': { getLogo: async () => ({ data: { logo } }) },
            '@/libs/system': {
              getHeaderName: () => '/products',
              getMenuSider: (routes) => routes,
              findFirstNonNullChildren: (route) => (route.children ? route.children[0] : route),
            },
          };
          function load(name) {
            if (mocks[name]) return mocks[name];
            if (name.includes('assets/')) return logo;
            if (cache[name]) return cache[name];
            const definition = files[name];
            if (!definition)
              return {
                template: name.endsWith('header.vue')
                  ? '<el-header class="layout-header">管理后台</el-header>'
                  : '<main class="el-main layout-main" style="height:100%;min-height:300px"><div class="el-scrollbar__wrap">内容区</div></main>',
              };
            const module = { exports: {} };
            cache[name] = module.exports;
            new Function('module', 'exports', 'require', definition.script)(module, module.exports, load);
            if (definition.template) Object.assign(module.exports.default, Vue.compile(definition.template));
            cache[name] = module.exports;
            return module.exports;
          }
          const themeModule = load('@/store/module/themeConfig.js').default;
          const saved = restore && JSON.parse(localStorage.getItem('from-crmeb-admin:themeConfigPrev'));
          if (saved) themeModule.state.themeConfig = saved;
          Object.assign(themeModule.state.themeConfig, {
            layout,
            isCollapse: false,
            isShowLogo: true,
          });
          const routes = [
            {
              path: '/products',
              title: '商品管理',
              icon: 'goods',
              is_show: true,
              children: [
                {
                  path: '/products/list',
                  title: '商品列表与库存管理',
                  icon: 'menu',
                  is_show: true,
                },
                {
                  path: '/products/category',
                  title: '商品分类',
                  icon: 'menu',
                  is_show: true,
                },
              ],
            },
          ];
          const store = new Vuex.Store({
            modules: {
              themeConfig: themeModule,
              app: { state: { adminTitle: '管理后台' } },
              menu: {
                namespaced: true,
                state: { activePath: '/products/list' },
              },
              routesList: { state: { routesList: routes } },
              menus: {
                namespaced: true,
                state: { childMenuList: routes[0].children },
                mutations: {
                  childMenuList(state, value) {
                    state.childMenuList = value;
                  },
                },
              },
            },
          });
          Vue.prototype.bus = new Vue();
          Vue.directive('db-click', {});
          Vue.prototype.$t = (text) => text;
          Vue.prototype.$route = { path: '/products/list', meta: {} };
          Vue.prototype.$router = { push() {} };
          window.app = new Vue({
            store,
            components: {
              defaults: load('@/layout/main/defaults.vue').default,
              classic: load('@/layout/main/classic.vue').default,
              columns: load('@/layout/main/columns.vue').default,
              transverse: load('@/layout/main/transverse.vue').default,
            },
            data: { visible: true },
            computed: {
              layout() {
                return this.$store.state.themeConfig.themeConfig.layout;
              },
            },
            template: '<div id="app"><component v-if="visible" :is="layout" /></div>',
          }).$mount('#app');
        },
        { files, layout, restore },
      );
      await page.locator('.layout-container').waitFor();
    }

    const width = (selector) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => Math.round(el.getBoundingClientRect().width));
    async function drag(selector, delta) {
      const handle = page.locator(`${selector} > .sidebar-resizer`).first();
      assert.equal(await handle.count(), 1, `${selector} has a resize handle`);
      const box = await handle.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + delta, box.y + 100, {
        steps: 6,
      });
      const currentWidth = await width(selector);
      assert.equal(
        await page
          .locator(selector)
          .first()
          .evaluate((el) => getComputedStyle(el).transitionDuration),
        '0s',
        'drag has no width animation',
      );
      await page.mouse.up();
      assert.equal(await page.evaluate(() => document.body.style.cursor), '', 'cursor restored');
      assert.equal(await page.evaluate(() => document.body.style.userSelect), '', 'selection restored');
      return currentWidth;
    }
    async function assertContentFits() {
      const boxes = await page.locator('.layout-aside, .layout-backtop').evaluateAll((els) =>
        els.map((el) => {
          const rect = el.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }),
      );
      assert(Math.abs(boxes[0].right - boxes[1].left) <= 1, 'content follows sidebar without gap/overlap');
      assert(boxes[1].right <= 1441, 'content stays in viewport');
    }

    for (const [layout, initial] of [
      ['defaults', 300],
      ['classic', 180],
      ['columns', 180],
    ]) {
      await mount(layout);
      assert.equal(await width('.layout-aside'), initial);
      assert.equal(await drag('.layout-aside', 90), initial + 90);
      await assertContentFits();
      assert.equal(await width('.layout-aside .el-menu'), initial + 90, 'menu tracks sidebar width');
      await mount(layout, true);
      assert.equal(await width('.layout-aside'), initial + 90, 'width survives reload');
      await page.evaluate(() => {
        app.$store.state.themeConfig.themeConfig.isCollapse = true;
      });
      await page.waitForTimeout(250);
      assert.equal(await width('.layout-aside'), layout === 'columns' ? 0 : 64);
      assert.equal(await page.locator('.layout-aside > .sidebar-resizer').count(), 0);
      await page.evaluate(() => {
        app.$store.state.themeConfig.themeConfig.isCollapse = false;
      });
      await page.waitForTimeout(250);
      assert.equal(await width('.layout-aside'), initial + 90, 'expand restores width');
      if (layout === 'columns') {
        assert.equal(await drag('.layout-columns-aside', 80), 150);
        assert.equal(await width('.layout-aside'), initial + 90, 'columns resize independently');
        await mount(layout, true);
        assert.equal(await width('.layout-columns-aside'), 150);
        await assertContentFits();
      }
      const screenshots = path.join(root, '.build/sidebar-resize/screenshots');
      fs.mkdirSync(screenshots, { recursive: true });
      await page.screenshot({ path: path.join(screenshots, `${layout}.png`) });
      assert.equal(await drag('.layout-aside', 1000), 480, 'upper bound');
      assert.equal(await drag('.layout-aside', -1000), 180, 'lower bound');
      console.log(`PASS ${layout}: drag, content alignment, bounds, persistence, collapse/expand`);
    }
    await mount('defaults', true);
    const beforeKeyboard = await width('.layout-aside');
    const handle = page.locator('.layout-aside > .sidebar-resizer');
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(250);
    assert.equal(await width('.layout-aside'), beforeKeyboard + 10, 'keyboard adjusts width');
    await page.keyboard.press('Home');
    await page.waitForTimeout(250);
    assert.equal(await width('.layout-aside'), 180);
    const switchBox = await handle.boundingBox();
    await page.mouse.move(switchBox.x + 2, switchBox.y + 100);
    await page.mouse.down();
    await page.mouse.move(switchBox.x + 62, switchBox.y + 100);
    await page.evaluate(() => {
      app.$store.state.themeConfig.themeConfig.layout = 'columns';
    });
    await page.mouse.up();
    assert.equal(
      await page.evaluate(() => app.$store.state.themeConfig.themeConfig.sidebarWidths.defaults),
      240,
      'switch during drag saves original layout width',
    );
    assert.equal(
      await page.evaluate(() => app.$store.state.themeConfig.themeConfig.sidebarWidths.columns),
      180,
      'switch does not overwrite destination layout width',
    );
    assert.equal(await page.evaluate(() => document.body.style.cursor), '');
    await mount('defaults', true);
    const box = await page.locator('.layout-aside > .sidebar-resizer').boundingBox();
    await page.mouse.move(box.x + 2, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 55, box.y + 100);
    await page.evaluate(() => {
      app.visible = false;
    });
    assert.equal(await page.evaluate(() => document.body.style.cursor), '', 'destroy ends dragging');
    assert.equal(await page.evaluate(() => document.body.style.userSelect), '', 'destroy restores selection');
    await page.mouse.up();
    await mount('defaults');
    await page.evaluate(() => {
      const config = app.$store.state.themeConfig.themeConfig;
      app.$delete(config, 'sidebarWidths');
      localStorage.setItem('from-crmeb-admin:themeConfigPrev', JSON.stringify(config));
    });
    await mount('defaults', true);
    assert.equal(await width('.layout-aside'), 300, 'old themes keep the original default width');
    assert.equal(await drag('.layout-aside', 30), 330, 'old themes gain reactive width settings');
    await page.evaluate(() => {
      app.$set(app.$store.state.themeConfig.themeConfig.sidebarWidths, 'defaults', 'invalid');
    });
    await page.waitForTimeout(250);
    assert.equal(await width('.layout-aside'), 300, 'invalid saved width falls back safely');
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new Error('Storage unavailable');
      };
    });
    assert.equal(await drag('.layout-aside', 30), 330, 'storage failure does not break dragging');
    const blurBox = await page.locator('.layout-aside > .sidebar-resizer').boundingBox();
    await page.mouse.move(blurBox.x + 2, blurBox.y + 100);
    await page.mouse.down();
    await page.mouse.move(blurBox.x + 22, blurBox.y + 100);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await page.evaluate(() => document.body.style.cursor), '', 'blur ends dragging');
    await page.mouse.move(blurBox.x + 102, blurBox.y + 100);
    assert.equal(await width('.layout-aside'), 350, 'blur removes move listeners');
    await page.mouse.up();
    await mount('transverse');
    assert.equal(await page.locator('.sidebar-resizer').count(), 0, 'horizontal layout unchanged');
    await page.setViewportSize({ width: 1000, height: 900 });
    await mount('columns');
    assert.equal(await page.locator('.sidebar-resizer').count(), 0, 'columns at the mobile breakpoint have no handles');
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.locator('.layout-columns-aside > .sidebar-resizer').waitFor();
    await page.setViewportSize({ width: 800, height: 900 });
    await mount('defaults');
    assert.equal(await page.locator('.sidebar-resizer').count(), 0, 'mobile has no drag handle');
    assert.deepEqual(errors, []);
    console.log('PASS cleanup, transverse and mobile layouts; no browser errors');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
