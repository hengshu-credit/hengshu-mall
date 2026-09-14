const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const conditionFields=JSON.parse(execFileSync('docker',['exec','crmeb_php','php','-r','require "/var/www/vendor/autoload.php"; echo json_encode(array_values(\\app\\services\\activity\\ranking\\RankingConditionTree::fields()));'],{encoding:'utf8'}));
const { root, modules, bundle } = require('./theme_component_harness.cjs');
const entries = [
  'template/admin/src/pages/marketing/ranking/index.vue',
  'template/admin/src/components/mobilePage/home_marketing_ranking.vue',
  'template/admin/src/components/mobilePage/home_marketing_rank_info.vue',
  'template/uni-app/subpackage/diyComponents/marketingRankInfo.vue',
  'template/uni-app/subpackage/diyComponents/marketingRanking.vue',
];
const compiled = bundle(entries[0], entries.slice(1), ['@/config/app']);
// UniApp's H5 compiler maps these native tags to block and inline HTML elements.
for (const [file, record] of Object.entries(compiled.records)) if (file.includes('/template/uni-app/') && record.template) {
  record.template = record.template.replace(/(<\/?)(view|text|image)(?=[\s>])/g, (_, start, tag) => start + ({ view: 'div', text: 'span', image: 'img' }[tag])).replace(/@tap(?=[.=:])/g,'@click');
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<div id="app"></div>');
    for (const file of ['vue/dist/vue.js', 'vuex/dist/vuex.js', 'element-ui/lib/index.js']) await page.addScriptTag({ path: path.join(modules, file) });
    await page.addStyleTag({ path: path.join(modules, 'element-ui/lib/theme-chalk/index.css') });
    await page.addStyleTag({content:'@font-face{font-family:element-icons;src:url(data:font/woff;base64,'+fs.readFileSync(path.join(modules,'element-ui/lib/theme-chalk/fonts/element-icons.woff')).toString('base64')+') format("woff");}'});
    await page.addStyleTag({ content: compiled.css + 'body{font-family:Arial,"Microsoft YaHei";margin:24px;background:#f7f8fa}*{box-sizing:border-box}' });
    await page.evaluate(({ records, main, conditionFields }) => {
      Vue.directive('auth', {});
      const rule = { id: 9, page_id: 50, name: '近30天家电畅销榜', description: '从真实成交与用户好评中，发现生活好物', entity_type: 'product', top_n: 20, priority: 50, enabled: 1, window_days: 30, sort_mode: 'single', metrics: [{ field: 'sales', direction: 'desc', weight: 100 }], adjustments: [], conditions: [], exclude_ids: [], match_mode: 'all', start_time: 0, end_time: 0, version: 1, status: 'running' };
      const rows = [{ id: 1, rank: 1, name: '智能空气净化器', price: 1299, sales: 200, reviews: 25, rating: 96, base_score: 100, score: 100, score_parts: [{ field: 'sales', raw: 200, normalized: 100, weight: 100 }], adjustment: { factor: 1, bonus: 0 } }];
      window.calls = []; window.failPreview = false; window.navigation = []; window.requests = {};
      const api = {
        rankingList: async () => ({ data: { list: [rule], count: 1 } }), rankingInfo: async () => ({ data: JSON.parse(JSON.stringify(rule)) }),
        rankingPreview: async body => { window.calls.push({ preview: body }); if (window.failPreview) throw { msg: '试算服务暂不可用' }; return { data: { list: rows, candidate_count: 10, calculated_at: 100 } }; },
        rankingSave: async (id, body) => { window.calls.push({ save: JSON.parse(JSON.stringify(body)) }); return { data: { id: id || 10 } }; },
        rankingStatus: async (id, enabled) => { window.calls.push({ id, enabled }); }, rankingDelete: async () => ({}),
        rankingOptions: async options => options.type==='condition_fields' ? {data:{list:conditionFields}} : ({ data: { list: [{ id: 1, name: '智能空气净化器' }, { id: 2, name: '高效净水器' }], count: 2 } }),
        getProductRankings: (id) => new Promise(resolve => window.requests[id] = resolve),
        getMarketingRanking: async () => ({ data: { ranking: { ...rule, page_url: '/pages/annex/special/index?theme_id=50' }, list: rows } }),
      };
      const stubs = { '@/api/ranking': api, '@/api/fullReduction': {}, '@/setting': { apiBaseURL: '' }, '@/config/app': { HTTP_REQUEST_URL: '' }, vuex: Vuex };
      const cache = {};
      window.loadRankComponent = id => {
        if (cache[id]) return cache[id].exports;
        const record = records[id]; if (!record) throw new Error('Missing module ' + id);
        const module = cache[id] = { exports: {} };
        new Function('module', 'exports', 'require', record.code)(module, module.exports, name => stubs[name] || (/\.(png|jpe?g)$/.test(name) ? '/sample-product.png' : window.loadRankComponent(record.dependencies[name])));
        if (record.template) { Object.assign(module.exports.default, Vue.compile(record.template)); module.exports.default._scopeId = record.scope; }
        return module.exports;
      };
      Vue.prototype.$routeProStr = '/admin'; Vue.prototype.$router = { push: value => window.navigation.push(value) };
      Vue.prototype.$copyText = async () => {};
      window.vm = new Vue(window.loadRankComponent(main).default).$mount('#app');
      window.uni = { navigateTo: value => window.navigation.push(value) };
    }, {...compiled,conditionFields});
    await page.getByText('近30天家电畅销榜', { exact: true }).waitFor();
    await page.locator('.ranking-hero button').click();
    await page.getByPlaceholder('例如：近30天家电畅销榜').fill('厨房好物精选榜');
    await page.getByRole('tab', { name: '2 入榜条件' }).click();
    await page.getByRole('button', { name: '添加条件',exact:true }).click();
    assert.equal(await page.locator('.tree-condition').count(), 1);
    await page.getByRole('button',{name:'添加条件组',exact:true}).click();
    const nested=page.locator('.rank-condition-group.is-nested').first();
    await nested.getByRole('button',{name:'添加条件',exact:true}).click();
    await nested.locator('.el-cascader').click();
    await page.locator('.el-cascader__dropdown:visible .el-cascader-menu').getByText('访问客户',{exact:true}).click();
    await page.locator('.el-cascader__dropdown:visible .el-cascader-menu').getByText('状态',{exact:true}).click();
    await page.locator('.el-cascader__dropdown:visible .el-cascader-menu').getByText('登录状态',{exact:true}).click();
    await nested.locator('.condition-value .el-select').click();
    await page.locator('.el-select-dropdown:visible').getByText('已登录',{exact:true}).click();
    await nested.locator('.group-heading').first().getByText('或',{exact:true}).click();
    await page.locator('.rank-rule-result h3').click();
    const tree=await page.evaluate(()=>vm.$children.find(c=>c.$options._componentTag==='ranking-form').form.condition_tree);
    assert.equal(tree.children[1].mode,'any');assert.equal(tree.children[1].children[0].field,'customer.logged_in');assert.deepEqual(tree.children[1].children[0].value,['1']);
    await page.locator('.rank-rule-result h3').click();await page.waitForTimeout(250);await page.locator('.rank-editor').evaluate(el=>el.scrollTop=0);await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(root,'.build/ranking-review/ranking-condition-tree.png'),fullPage:true});
    await page.getByRole('tab', { name: '3 排序与权重' }).click();
    await page.getByRole('button', { name: '试算当前配置', exact: true }).click();
    await page.getByText('候选 10 项 · 入榜 1 项').waitFor();
    await page.getByText('智能空气净化器', { exact: true }).first().waitFor();
    await page.evaluate(() => { const form = vm.$children.find(child => child.$options._componentTag === 'ranking-form'); form.form.priority = 88; form.form.top_n = 10; });
    await page.getByText('配置已修改，请重新试算。').waitFor();
    await page.getByRole('button', { name: '试算当前配置', exact: true }).click();
    const screenshotDir = path.join(root, '.build/ranking-review'); fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'ranking-builder.png'), fullPage: true });
    await page.getByRole('button', { name: '保存榜单', exact: true }).click();
    const saved = await page.evaluate(() => calls.find(item => item.save).save);
    assert.equal(saved.name, '厨房好物精选榜'); assert.equal(saved.priority, 88); assert.equal(saved.top_n, 10); assert.equal(saved.condition_tree.children[0].op, 'gte');
    await page.getByRole('button', { name: '装修专题页 #50' }).click();
    assert.equal(await page.evaluate(() => navigation[0].query.id), 50);
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    await page.getByPlaceholder('例如：近30天家电畅销榜').waitFor();
    await page.evaluate(() => window.failPreview = true);
    await page.getByRole('button', { name: '试算当前配置', exact: true }).click();
    await page.getByText('试算服务暂不可用', { exact: true }).waitFor();
    console.log('PASS: create/filter/preview/save/edit/error and dedicated decoration navigation');
    await page.evaluate(({ records, mobile }) => {
      vm.$destroy(); document.body.innerHTML = '<div id="mobile"></div>';
      const component = window.loadRankComponent(mobile).default;
      window.viewerStore=new Vuex.Store({state:{app:{uid:1,token:'fixture-a'}}});
      window.badge = new Vue({ ...component, store:viewerStore,propsData: { productId: 1, dataConfig: { limit: 2 } } }).$mount('#mobile');
    }, { records: compiled.records, mobile: Object.keys(compiled.records).find(file => file.endsWith('/diyComponents/marketingRankInfo.vue')) });
    await page.evaluate(async () => { badge.productId = 2; await Vue.nextTick(); requests[2]({ data: { list: [{ id: 9, name: '优先榜', rank: 1, entity_type: 'product', page_url: '/pages/annex/special/index?theme_id=50' }] } }); await Vue.nextTick(); requests[1]({ data: { list: [{ id: 1, name: '过期请求', rank: 8 }] } }); });
    await page.getByText('优先榜', { exact: true }).waitFor(); assert.equal(await page.getByText('过期请求', { exact: true }).count(), 0);
    await page.getByText('·第1名', { exact: true }).click();
    assert.equal(await page.evaluate(() => navigation[navigation.length - 1].url), '/pages/annex/special/index?theme_id=50');
    await page.evaluate(async () => { badge.productId = 3; await Vue.nextTick(); requests[3]({ data: { list: [] } }); });
    await page.waitForFunction(() => document.querySelectorAll('.rank-info').length === 0);
    await page.evaluate(async()=>{viewerStore.state.app.uid=2;viewerStore.state.app.token='fixture-b';await Vue.nextTick();requests[3]({data:{list:[{id:77,name:'客户乙专属榜',rank:1,entity_type:'product'}]}});});
    await page.getByText('客户乙专属榜',{exact:true}).waitFor();
    await page.evaluate(async()=>{viewerStore.state.app.uid=0;viewerStore.state.app.token=false;await Vue.nextTick();});
    assert.equal(await page.getByText('客户乙专属榜',{exact:true}).count(),0,'logging out immediately clears the previous viewer ranking');
    await page.evaluate(()=>requests[3]({data:{list:[]}}));
    console.log('PASS: badge navigation, highest product placement, stale-response suppression and empty hiding');
    assert.deepEqual(errors, []); console.log('Ranking browser regressions complete.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
