const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const modules = path.join(root, 'template/admin/node_modules');
const babel = require(path.join(modules, '@babel/core'));
const compiler = require(path.join(modules, 'vue-template-compiler'));
const sfc = compiler.parseComponent(fs.readFileSync(path.join(root, 'template/admin/src/pages/setting/setSystem/index.vue'), 'utf8'));
const script = babel.transformSync(sfc.script.content, { babelrc: false, configFile: false,
  plugins: [require(path.join(modules, '@babel/plugin-transform-modules-commonjs'))] }).code;
cp.execFileSync('docker', ['cp', path.join(root, 'tests/regression/jd_collection.php'), 'crmeb_php:/tmp/jd-token-check/tests/regression/jd_collection.php']);
const fixture = JSON.parse(cp.execFileSync('docker', ['exec', 'crmeb_php', 'php', '-r',
  'ob_start(); require "/tmp/jd-token-check/tests/regression/jd_collection.php"; ob_end_clean(); echo json_encode(["tabs"=>$tabs,"basic"=>[$providerRule],"jd"=>$formRules]);']).toString());
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<div id="app"></div>');
    await page.addScriptTag({ path: path.join(modules, 'vue/dist/vue.js') });
    await page.addScriptTag({ path: path.join(modules, 'element-ui/lib/index.js') });
    await page.addScriptTag({ path: path.join(modules, '@form-create/element-ui/dist/form-create.js') });
    await page.addStyleTag({ path: path.join(modules, 'element-ui/lib/theme-chalk/index.css') });
    await page.evaluate(({ script, template, fixture }) => {
      Vue.directive('loading', {});
      window.saved = [];
      const module = { exports: {} };
      const imports = {
        '@form-create/element-ui': formCreate,
        '@/api/setting': {
          headerListApi: async () => ({ data: { config_tab: fixture.tabs } }),
          dataFromApi: async ({ tab_id }) => ({ data: { title: '商品采集配置', rules: JSON.parse(JSON.stringify(tab_id === -9101 ? fixture.jd : fixture.basic)), action: '/config-save', method: 'POST' } }),
        },
        '@/libs/request': async body => { saved.push(body.data); return { msg: '已保存' }; },
      };
      new Function('module', 'exports', 'require', script)(module, module.exports, name => imports[name] || {});
      const options = module.exports.default;
      Object.assign(options, Vue.compile(template));
      window.settingsPage = new Vue({ ...options, beforeCreate() {
        this.$route = { params: { type: '2', tab_id: '41' }, query: {}, name: 'setting_setSystem', meta: {} };
      } }).$mount('#app');
    }, { script, template: sfc.template.content, fixture });
    await page.getByRole('tab', { name: '本地京东采集' }).click();
    const secret = page.locator('input[type=password]');
    await secret.waitFor();
    assert.equal(await secret.inputValue(), '');
    await secret.fill('x'.repeat(36));
    await page.getByRole('button', { name: '提交', exact: true }).click();
    await page.waitForFunction(() => saved.length === 1);
    assert.deepEqual(Object.keys(await page.evaluate(() => saved[0])).sort(), ['jd_crawler_token', 'jd_crawler_url']);
    await page.getByRole('tab').first().click();
    await page.getByText('本地京东采集服务', { exact: true }).waitFor();
    await page.getByText('一号通', { exact: true }).click();
    await page.getByRole('button', { name: '提交', exact: true }).click();
    await page.waitForFunction(() => saved.length === 2);
    assert.deepEqual(await page.evaluate(() => saved[1]), { system_product_copy_type: 1 });
    assert.deepEqual(errors, []);
    console.log('PASS browser: real PHP form rules, standalone JD tab, provider radio, form switching and isolated save fields');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
