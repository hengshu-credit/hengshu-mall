// Load real Vue SFCs and shared modules. Only API and media/link dialogs are mocked.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const modules = path.join(root, 'template/admin/node_modules');
const babel = require(path.join(modules, '@babel/core'));
const compiler = require(path.join(modules, 'vue-template-compiler'));
const styles = require(path.join(modules, '@vue/component-compiler-utils'));
const transform = source => babel.transformSync(source, { babelrc: false, configFile: false, plugins: [require(path.join(modules, '@babel/plugin-transform-modules-commonjs'))] }).code;
function bundle(entry, extra = []) {
  const records = {}, css = [];
  function load(file) {
    file = file.replace(/\\/g, '/');
    if (!fs.existsSync(file)) file += fs.existsSync(file + '.vue') ? '.vue' : '.js';
    if (records[file]) return file;
    const source = fs.readFileSync(file, 'utf8');
    const sfc = file.endsWith('.vue') ? compiler.parseComponent(source) : null;
    const record = records[file] = { code: transform(sfc ? sfc.script.content : source), dependencies: {} };
    if (sfc) {
      const id = 'data-v-test' + Object.keys(records).length;
      record.template = sfc.template.content; record.scope = id;
      for (const style of sfc.styles) {
        const out = styles.compileStyle({ source: style.content, filename: file, id, scoped: !!style.scoped, preprocessLang: style.lang, preprocessOptions: { quietDeps: true, silenceDeprecations: ['legacy-js-api'] } });
        if (out.errors.length) throw out.errors[0];
        css.push(out.code);
      }
    }
    for (const match of record.code.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const name = match[1];
      if (/\.(png|svg|jpe?g)$/.test(name) || /^@\/(api|setting|components\/(uploadPictures|linkaddress))/.test(name)) continue;
      if (name.startsWith('.') || name.startsWith('@/')) record.dependencies[name] = load(name.startsWith('@/') ? path.join(root, 'template/admin/src', name.slice(2)) : path.resolve(path.dirname(file), name));
    }
    return file;
  }
  const main = load(path.join(root, entry));
  extra.forEach(file => load(path.join(root, file)));
  return { main, records, css: css.join('\n') };
}
async function install(page, compiled) {
  await page.setContent('<div id="app"></div>');
  for (const file of ['vue/dist/vue.js', 'vuex/dist/vuex.js', 'element-ui/lib/index.js', 'sortablejs/Sortable.js', 'vuedraggable/dist/vuedraggable.umd.js', 'html2canvas/dist/html2canvas.js']) await page.addScriptTag({ path: path.join(modules, file) });
  await page.addStyleTag({ path: path.join(modules, 'element-ui/lib/theme-chalk/index.css') });
  await page.addStyleTag({ content: '*{box-sizing:border-box}body{margin:0;font-family:Arial,"Microsoft YaHei",sans-serif}#app{height:960px}:root{--prev-color-primary:#155EEF}.c_row-item{display:flex;padding:10px 15px}.c_label{width:90px;flex-shrink:0;color:#999;font-size:12px}' + compiled.css });
  await page.evaluate(({ records, main }) => {
    const cache = {};
    window.saved = []; window.failSave = false; window.covers = []; window.uploads = [];
    window.themeData = { category: 1, home: { value: {} }, detail: { value: {} }, user: { value: {} }, theme: { theme_color: '#155EEF' } };
    const stubs = { html2canvas: window.html2canvas, '@/api/setting': { fileUpload: async data => { uploads.push({ size:data.get('file').size, name:data.get('file').name }); return {status:200,data:{src:'/uploads/test-cover.png'}}; } }, '@/api/product': { productListApi:async()=>({data:{list:window.previewCatalog||[]}}) }, '@/api/diy': { saveThemeImage: async (id, body) => { if(window.failCover) throw {msg:'模拟封面保存失败'}; covers.push({id,...body}); return {status:200}; }, getProductList:async()=>({data:{list:window.previewProducts||[]}}), themeInfo: async (_, type) => ({ data: JSON.parse(JSON.stringify(themeData[type] || {})) }), themeSave: async (_, body) => { if (window.failSave) throw { msg: '模拟保存失败' }; saved.push(JSON.parse(JSON.stringify(body))); if(Number(_)) themeData[body.type] = JSON.parse(JSON.stringify(body.value)); return { data: { id: 42 }, msg: '保存成功' }; } }, '@/setting': { routePre: '/admin', apiBaseURL: 'http://127.0.0.1:8011' }, vuex: Vuex, vuedraggable };
    window.loadComponent = function load(id) {
      if (cache[id]) return cache[id].exports;
      const r = records[id], m = cache[id] = { exports: {} };
      new Function('module', 'exports', 'require', r.code)(m, m.exports, name => {
        if (r.dependencies[name]) return load(r.dependencies[name]);
        if (stubs[name]) return stubs[name];
        if (/\.(png|svg|jpe?g)$/.test(name)) return '';
        if (/uploadPictures|linkaddress/.test(name)) return { template: '<div></div>', data: () => ({ modals: false }) };
        throw new Error('Unmocked import ' + name);
      });
      if (r.template) { Object.assign(m.exports.default, Vue.compile(r.template)); m.exports.default._scopeId = r.scope; }
      return m.exports;
    };
    window.mountEditor = function() {
      if (window.editor) { editor.$destroy(); document.body.innerHTML = '<div id="app"></div>'; }
      const options = loadComponent(main).default;
      Vue.prototype.$route = Vue.observable({query:{id:42}}); Vue.prototype.$router = {push() {}, replace({query}) { Vue.prototype.$route.query=query; return Promise.resolve(); }};
      window.editor = new Vue({ ...options, parent: new Vue({ provide: { setDirty: value => window.dirty = value } }), store: new Vuex.Store({ state: { mobildConfig: {}, themeConfig: { themeColor: '#155EEF' } } }), provide: { setDirty: value => window.dirty = value }, beforeCreate() {  } }).$mount('#app');
    };
    mountEditor();
  }, compiled);
}
module.exports = { bundle, install, root, modules, transform, compiler };


