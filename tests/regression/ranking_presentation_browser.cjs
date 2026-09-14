const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { root, modules, bundle } = require('./theme_component_harness.cjs');
const compiled = bundle('template/admin/src/components/themeActions/RankingDisplay.vue', [
  'template/admin/src/components/themeActions/RankingSettings.vue', 'template/admin/src/components/themeActions/RankingDetailDisplay.vue', 'template/shared/rankingComponent.js',
]);
const out = path.join(root, '.build/ranking-review'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1420, height: 1050 } }); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const photoFiles = ['crmeb/public/uploads/attach/2023/02/20230213/5b64e6584c06020347a5fa58af79d42a.png','crmeb/public/uploads/attach/2023/02/20230213/5ae4f6a3f8bf153beb849e02e14b5c40.png','crmeb/public/uploads/attach/2023/02/20230213/3b570808fc3593aa51b2a94ceaba3e6f.png','template/admin/src/assets/images/product-diy.png'];
    await page.route('https://rank.test/**', route => { const url=new URL(route.request().url());const index=Number((url.pathname.match(/product-(\d+)/)||[])[1]||3);const file=url.pathname.startsWith('/statics/ranking/')?path.join(root,'crmeb/public',url.pathname):path.join(root,photoFiles[index%4]);return route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},contentType:({'.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'image/png',body:fs.readFileSync(fs.existsSync(file)?file:path.join(root,photoFiles[3]))}); });
    await page.setContent('<div id="app"></div>');
    for (const file of ['vue/dist/vue.js', 'vuex/dist/vuex.js', 'element-ui/lib/index.js']) await page.addScriptTag({ path: path.join(modules, file) });
    await page.addStyleTag({ path: path.join(modules, 'element-ui/lib/theme-chalk/index.css') });
    await page.addStyleTag({ content: compiled.css + '*{box-sizing:border-box}body{margin:0;font-family:Arial,"Microsoft YaHei";background:#f4f3ef}.audit-page{display:grid;grid-template-columns:410px 380px;gap:30px;justify-content:center;padding:24px}.audit-display{padding:12px;background:#fff;border-radius:16px;align-self:start}.audit-settings{height:980px;overflow:auto;background:#fff;padding:10px}.preset-gallery{display:flex;gap:24px;padding:32px}.preset-phone{width:390px;flex-shrink:0;background:#fff;border-radius:20px;padding:12px}.preset-label{font-size:17px;color:#3e352a;font-weight:bold;padding:10px 8px 18px}' });
    await page.evaluate(({ records, main }) => {
      const cache = {};
      const stubs = { '@/setting': { apiBaseURL: 'https://rank.test/adminapi' }, '@/api/ranking': { rankingList: async () => ({ data: { list: [{ id: 9, name: '生活好物精选榜', entity_type: 'product' }] } }) }, vuex: Vuex };
      window.loadPresentation = id => {
        if (cache[id]) return cache[id].exports; const record = records[id]; if (!record) throw new Error('Missing module ' + id);
        const module = cache[id] = { exports: {} };
        new Function('module', 'exports', 'require', record.code)(module, module.exports, name => { if(stubs[name]) return stubs[name]; if(/uploadPictures|linkaddress/.test(name)) return { template: '<div />' }; if(/\.(png|jpe?g)$/.test(name))return 'https://rank.test/product-3.png'; if(/^@\/api\//.test(name)) return {}; if(!record.dependencies[name]) throw new Error('Unmocked import '+name); return loadPresentation(record.dependencies[name]); });
        if (record.template) { Object.assign(module.exports.default, Vue.compile(record.template)); module.exports.default._scopeId = record.scope; }
        return module.exports;
      };
      const find = suffix => Object.keys(records).find(key => key.endsWith(suffix));
      window.styleModule = loadPresentation(find('/rankingPresentation.js'));
      window.makeConfig = loadPresentation(find('/rankingComponent.js')).rankingComponent;
      const config = makeConfig('marketingRanking', { rankingId: 9, limit: 5, showScore: true, setUp: { tabVal: 1 }, appearance: { followTheme: false, header: { showOverline: true }, footer: { show: true } } }, 1);
      const store = new Vuex.Store({ state: { mobildConfig: { defaultArray: { 1: config } } } });
      const display = loadPresentation(main).default, settings = loadPresentation(find('/RankingSettings.vue')).default, detail = loadPresentation(find('/RankingDetailDisplay.vue')).default;
      window.rows = ['Apple iPad mini 6 64G WLAN版', 'Jeep蓝牙通话智能手表 P07', 'Xiaomi Civi 2 8GB+128GB', '美的多段控温电热水壶', 'Apple iPad mini 6 平板电脑'].map((name, i) => ({ id: i + 1, rank: i + 1, name, price: ['3999.00','269.00','2299.00','129.00','3999.00'][i], image: 'https://rank.test/product-'+i+'.png', sales: 650 - i * 50, reviews: 200 - i * 20, rating: 98.5 - i, score: 99 - i * 4 }));
      window.vm = new Vue({ store, components: { RankDisplay: display, RankSettings: settings, RankDetail: detail },
        data: { rows, ranking: { name: '商品热销榜', description: '近30天 · TOP5', entity_type: 'product', page_url: '/example' }, mode: 'edit', gallery: [] },
        computed: { cfg() { return store.state.mobildConfig.defaultArray[1]; } },
        template: '<div><div v-if="mode === \'edit\'" class="audit-page"><div class="audit-display"><rank-display ref="display" :config="cfg" :rows="rows" :ranking="ranking"/><rank-detail v-if="showDetail" :config="cfg" :rows="detailRows"/></div><div class="audit-settings"><rank-settings ref="settings" :num="1"/></div></div><div v-else class="preset-gallery"><div v-for="item in gallery" :key="item.name" class="preset-phone"><div class="preset-label">{{item.name}}</div><rank-display :config="item.config" :rows="item.rows || rows" :ranking="item.ranking || ranking"/></div></div></div>',
        computed: { cfg() { return store.state.mobildConfig.defaultArray[1]; }, showDetail() { return this.ranking.entity_type === 'detail'; }, detailRows() { return [{ id: 90, name: '品质好物榜', rank: 2, entity_type: 'product' }]; } },
      }).$mount('#app');
      window.reset = () => { store.state.mobildConfig.defaultArray[1] = makeConfig('marketingRanking', { rankingId: 9, limit: 5, showScore: true, setUp: { tabVal: 1 }, appearance: { followTheme: false, header: { showOverline: true }, footer: { show: true } } }, 1); vm.ranking.entity_type = 'product'; vm.rows = rows; };
      window.setStyle = (key, value) => { const keys = key.split('.'); let obj = vm.cfg.appearance; keys.slice(0, -1).forEach(key => obj = obj[key]); Vue.set(obj, keys[keys.length - 1], value); };
    }, compiled);
    let checks = 0;
    const set = async (key, value) => page.evaluate(async ([key, value]) => { setStyle(key, value); await Vue.nextTick(); }, [key, value]);
    const css = async (selector, property) => page.locator('.audit-display ' + selector).first().evaluate((el, property) => getComputedStyle(el)[property], property);
    const expectCss = async (key, value, selector, property, expected) => { await set(key, value); assert.equal(await css(selector, property), expected, key); checks++; };
    const card = '.rp-card[data-rank="1"]', badge = card + ' .rp-badge';
    await page.locator('.audit-display .rp-card').first().waitFor();
    // Exercise real controls first, then verify the persisted values reach the same rendered elements.
    await page.locator('.audit-settings [data-field="padding"] input').first().fill('21');
    await page.locator('.audit-settings [data-field="padding"] input').first().press('Tab');
    assert.equal(await css(card, 'paddingTop'), '21px'); checks++;
    for (const [key, value, selector, prop, expected] of [
      ['gap',18,'.rp-group','rowGap','18px'],['imageGap',19,card,'columnGap','19px'],
      ['header.padding',27,'.rp-header','paddingTop','27px'],['header.align','right','.rp-header','textAlign','right'],
      ['header.titleSize',31,'.rp-title','fontSize','31px'],['header.titleColor','#123456','.rp-title','color','rgb(18, 52, 86)'],['header.titleBold',false,'.rp-title','fontWeight','400'],
      ['header.overlineSize',15,'.rp-overline','fontSize','15px'],['header.overlineColor','#123456','.rp-overline','color','rgb(18, 52, 86)'],['header.overlineSpacing',5,'.rp-overline','letterSpacing','5px'],
      ['header.descriptionSize',17,'.rp-description','fontSize','17px'],['header.descriptionColor','#123456','.rp-description','color','rgb(18, 52, 86)'],['header.gap',14,'.rp-description','marginTop','14px'],
      ['header.moreSize',18,'.rp-more','fontSize','18px'],['header.moreColor','#123456','.rp-more','color','rgb(18, 52, 86)'],
      ['content.imageWidth',106,'.rp-image','width','106px'],['content.imageHeight',111,'.rp-image','height','111px'],['content.imageRadius',20,'.rp-image','borderRadius','20px'],['content.imageBackground','#123456','.rp-image','backgroundColor','rgb(18, 52, 86)'],['content.imageFit','cover','.rp-image','objectFit','cover'],['content.imageBorderWidth',3,'.rp-image','borderTopWidth','3px'],['content.imageBorderColor','#123456','.rp-image','borderTopColor','rgb(18, 52, 86)'],
      ['content.nameSize',20,'.rp-card-name','fontSize','20px'],['content.nameBold',false,'.rp-card-name','fontWeight','400'],['content.nameLines',3,'.rp-card-name','webkitLineClamp','3'],['content.lineHeight',2,'.rp-card-name','lineHeight','40px'],['content.gap',13,'.rp-card-body','rowGap','13px'],
      ['content.priceSize',23,'.rp-card-price','fontSize','23px'],['content.priceBold',false,'.rp-card-price','fontWeight','400'],['content.metaSize',16,'.rp-card-metrics','fontSize','16px'],
      ['ranks.top1.titleColor','#123456',card+' .rp-card-name','color','rgb(18, 52, 86)'],['ranks.top1.priceColor','#123456',card+' .rp-card-price','color','rgb(18, 52, 86)'],['ranks.top1.metaColor','#123456',card+' .rp-card-metrics','color','rgb(18, 52, 86)'],
      ['ranks.top1.badge.fontSize',19,badge,'fontSize','19px'],['ranks.top1.badge.bold',false,badge,'fontWeight','400'],['ranks.top1.badge.width',66,badge,'width','66px'],['ranks.top1.badge.height',45,badge,'height','45px'],['ranks.top1.badge.textColor','#123456',badge,'color','rgb(18, 52, 86)'],
      ['footer.color','#123456','.rp-footer','color','rgb(18, 52, 86)'],['footer.fontSize',15,'.rp-footer','fontSize','15px'],['footer.padding',20,'.rp-footer','paddingTop','20px'],['footer.align','left','.rp-footer','textAlign','left'],
    ]) await expectCss(key,value,selector,prop,expected);
    // Every surface option is tested on the header, TOP1 card and TOP1 badge.
    for (const [prefix, selector] of [['header.surface','.rp-header'],['ranks.top1.card',card],['ranks.top1.badge',badge]]) {
      await set(prefix+'.mode','solid');
      for (const [key,value,prop,expected] of [['color','#234567','backgroundColor','rgb(35, 69, 103)'],['borderWidth',4,'borderTopWidth','4px'],['borderStyle','dashed','borderTopStyle','dashed'],['borderColor','#345678','borderTopColor','rgb(52, 86, 120)'],['radius',17,'borderRadius','17px']]) await expectCss(prefix+'.'+key,value,selector,prop,expected);
      await set(prefix+'.mode','gradient'); await set(prefix+'.color2','#6789ab'); await set(prefix+'.angle',220);
      assert.match(await css(selector,'backgroundImage'),/220deg.*103, 137, 171/); checks++;
      await set(prefix+'.mode','image'); await set(prefix+'.image','https://rank.test/background.svg'); await set(prefix+'.imageFit','contain'); await set(prefix+'.imagePosition','bottom');
      assert.match(await css(selector,'backgroundImage'),/background.svg/); assert.equal(await css(selector,'backgroundSize'),'contain'); assert.equal(await css(selector,'backgroundPosition'),'50% 100%'); checks+=3;
      await set(prefix+'.shadow',true); await set(prefix+'.shadowColor','#456789'); await set(prefix+'.shadowX',7); await set(prefix+'.shadowY',9); await set(prefix+'.shadowBlur',21);
      assert.match(await css(selector,'boxShadow'),/69, 103, 137.*7px 9px 21px/); checks++;
    }
    await page.evaluate(async()=>{reset();await Vue.nextTick();});
    await set('layout','grid'); await expectCss('columns',3,'.rp-group','display','grid'); assert.equal((await css('.rp-group','gridTemplateColumns')).split(' ').length,3); checks++;
    await expectCss('content.gridImageHeight',175,'.rp-image','height','175px');
    await set('layout','podium'); await expectCss('podiumLift',29,'.rp-card[data-rank="2"]','marginTop','29px'); await expectCss('content.podiumImageSize',64,'.rp-card[data-rank="1"] .rp-image','width','64px');
    assert.deepEqual(await page.locator('.rp-group-podium .rp-card').evaluateAll(els=>els.map(el=>Number(el.dataset.rank))),[2,1,3]); checks++;
    await set('layout','list'); await set('badgePosition','image'); assert.equal(await css(badge,'position'),'absolute'); checks++;
    await set('badgePosition','corner'); assert.equal(await page.locator('.audit-display '+card+' > .rp-badge-overlay').count(),1); checks++;
    await set('ranks.top1.badge.shape','medal'); assert.equal(await css(badge,'borderRadius'),'50%'); checks++;
    await set('ranks.top1.badge.shape','image'); await set('ranks.top1.badge.customImage','https://rank.test/medal.svg'); await set('ranks.top1.badge.showText',false); assert.equal(await page.locator('.audit-display '+badge+' .rp-badge-text').count(),0); assert.match(await page.locator('.audit-display '+badge+' img').getAttribute('src'),/medal.svg/); checks+=2;
    await set('ranks.top1.badge.shape','text'); await set('ranks.top1.badge.text','第{rank}名'); assert.equal(await page.locator('.audit-display '+badge).innerText(),'第1名'); checks++;
    await set('ranks.top2.card.color','#abcdef'); assert.equal(await css('.rp-card[data-rank="2"]','backgroundColor'),'rgb(171, 205, 239)'); assert.notEqual(await css(card,'backgroundColor'),'rgb(171, 205, 239)'); checks++;
    await set('ranks.top3.badge.text','第三名'); assert.equal(await page.locator('.audit-display .rp-card[data-rank="3"] .rp-badge').innerText(),'第三名'); checks++;
    await set('ranks.normal.card.color','#cdefab'); assert.equal(await css('.rp-card[data-rank="4"]','backgroundColor'),'rgb(205, 239, 171)'); checks++;
    await page.evaluate(async()=>{const style=JSON.parse(JSON.stringify(vm.cfg.appearance.ranks.normal));style.card.color='#aabbcc';vm.cfg.appearance.ranges=[{from:4,to:5,style}];await Vue.nextTick();});
    assert.equal(await css('.rp-card[data-rank="5"]','backgroundColor'),'rgb(170, 187, 204)'); checks++;
    for (const [key,selector] of [['showName','.rp-card-name'],['showPrice','.rp-card-price'],['showImage','.rp-media']]) { await set('content.'+key,false); assert.equal(await page.locator('.audit-display '+selector).count(),0); await set('content.'+key,true); checks++; }
    for (const [key,label,value] of [['Sales','售出',650],['Reviews','评论',200],['Rating','口碑','98.5%']]) { await set('content.show'+key,true); await set('content.'+key.toLowerCase()+'Label',label); await page.locator('.audit-display '+card+' .rp-card-metrics').getByText(label+' '+value,{exact:true}).waitFor(); checks++; }
    await set('content.scoreLabel','热度'); await page.locator('.audit-display '+card+' .rp-card-metrics').getByText('热度 99.00',{exact:true}).waitFor(); checks++;
    await set('content.showButton',true); await set('content.buttonText','发现好物');
    for (const [key,value,prop,expected] of [['buttonColor','#123456','color','rgb(18, 52, 86)'],['buttonBackground','#234567','backgroundColor','rgb(35, 69, 103)'],['buttonBorderWidth',3,'borderTopWidth','3px'],['buttonBorderColor','#345678','borderTopColor','rgb(52, 86, 120)'],['buttonRadius',9,'borderRadius','9px'],['buttonSize',16,'fontSize','16px'],['buttonPaddingX',18,'paddingLeft','18px'],['buttonPaddingY',10,'paddingTop','10px']]) await expectCss('content.'+key,value,'.rp-card-button',prop,expected);
    await set('content.order',['button','metrics','price','name']); assert.equal(await page.locator('.audit-display '+card+' .rp-card-body > :first-child').innerText(),'发现好物'); checks++;
    await set('header.description','这是装修独立说明'); assert.equal(await page.locator('.audit-display .rp-description').innerText(),'这是装修独立说明');
    await set('header.overline','本周精选'); assert.equal(await page.locator('.audit-display .rp-overline').innerText(),'本周精选');
    await set('header.moreText','查看完整榜单'); assert.match(await page.locator('.audit-display .rp-more').innerText(),/查看完整榜单/); checks+=3;
    await set('header.icon','https://rank.test/icon.svg'); await expectCss('header.iconSize',54,'.rp-header-icon','width','54px');
    await set('content.pricePrefix','参考价 ¥'); assert.match(await page.locator('.audit-display '+card+' .rp-card-price').innerText(),/^参考价 ¥/); checks++;
    await set('footer.text','每一次选择都有依据'); assert.equal(await page.locator('.audit-display .rp-footer').innerText(),'每一次选择都有依据'); await set('footer.show',false); assert.equal(await page.locator('.audit-display .rp-footer').count(),0); checks+=2;
    const before = await page.locator('.audit-display').innerHTML();
    await page.evaluate(async()=>{vm.$store.state.mobildConfig.defaultArray[1]=JSON.parse(JSON.stringify(vm.cfg));await Vue.nextTick();});
    assert.equal(await page.locator('.audit-display').innerHTML(),before); checks++;
    await page.evaluate(async()=>{vm.rows=[];await Vue.nextTick();}); await set('empty.text','即将揭晓');
    await expectCss('empty.color','#123456','.rp-empty','color','rgb(18, 52, 86)'); await expectCss('empty.fontSize',20,'.rp-empty','fontSize','20px'); await expectCss('empty.padding',33,'.rp-empty','paddingTop','33px'); await set('empty.hide',true); assert.equal(await page.locator('.audit-display .ranking-display').count(),0); checks++;
    await page.evaluate(async()=>{reset();await Vue.nextTick();});
    await set('followTheme',true); await set('content.showButton',true);
    await page.evaluate(()=>{document.documentElement.style.setProperty('--view-theme','#005fcc');document.documentElement.style.setProperty('--view-priceColor','#118855');});
    assert.equal(await css('.rp-card-price','color'),'rgb(17, 136, 85)'); assert.equal(await css('.rp-card-button','backgroundColor'),'rgb(0, 95, 204)'); checks+=2;
    await set('followTheme',false); await set('ranks.top1.priceColor','#123456'); assert.equal(await css(card+' .rp-card-price','color'),'rgb(18, 52, 86)'); checks++;
    await page.evaluate(async()=>{reset();document.documentElement.style.setProperty('--view-theme','#e93323');document.documentElement.style.setProperty('--view-priceColor','#e93323');await Vue.nextTick();});
    await page.locator('.preset-hot').click(); assert.equal(await page.evaluate(()=>vm.cfg.appearance.cardLayout),'retail'); assert.equal(await page.evaluate(()=>vm.cfg.rankingId),9);
    await page.getByRole('button',{name:'撤销本次预设'}).click(); assert.equal(await page.evaluate(()=>vm.cfg.appearance.layout),'list'); checks+=3;
    await page.evaluate(async()=>{vm.ranking.entity_type='detail';await Vue.nextTick();});
    await expectCss('detail.fontSize',19,'.rp-detail-name','fontSize','19px'); await expectCss('detail.bold',true,'.rp-detail-name','fontWeight','700'); await expectCss('detail.arrowColor','#123456','.rp-detail-arrow','color','rgb(18, 52, 86)'); await expectCss('detail.arrowSize',30,'.rp-detail-arrow','fontSize','30px');
    await set('detail.rankText','排名{rank}'); await set('detail.shopLabel','店铺'); assert.equal(await page.locator('.rp-detail-position').innerText(),'·排名2'); await set('detail.showShopLabel',false); assert.equal(await page.locator('.rp-detail-position').innerText(),'·排名2'); await set('detail.showArrow',false); assert.equal(await page.locator('.rp-detail-arrow').count(),0); checks+=3;

    await page.evaluate(async()=>{reset();await Vue.nextTick();});
    await set('cardLayout','commerce'); await set('content.showButton',true);
    assert.equal(await page.locator('.audit-display '+card+' > .rp-purchase').count(),1);
    const footerBounds=await page.locator('.audit-display '+card+' > .rp-purchase').boundingBox(),cardBounds=await page.locator('.audit-display '+card).boundingBox();assert(Math.abs(footerBounds.width-cardBounds.width)<3);checks++;
    assert.equal(await page.locator('.audit-display '+card+' .rp-card-body .rp-card-price').count(),0); checks+=2;
    await expectCss('commerce.color','#123456',card+' > .rp-purchase','backgroundColor','rgb(18, 52, 86)');
    await expectCss('commerce.paddingX',18,card+' > .rp-purchase','paddingLeft','18px');
    await expectCss('commerce.paddingY',13,card+' > .rp-purchase','paddingTop','13px');
    await expectCss('commerce.reverse',true,card+' > .rp-purchase','flexDirection','row-reverse');
    await set('cardLayout','retail'); assert.equal(await page.locator('.audit-display '+card+' .rp-card-body > .rp-purchase').count(),1); checks++;
    await set('content.highlightMetric','sales'); await set('content.highlightLabel','已售');
    assert.equal(await page.locator('.audit-display '+card+' .rp-highlight').innerText(),'已售 650'); checks++;
    await expectCss('content.highlightColor','#345678','.rp-highlight','color','rgb(52, 86, 120)');
    await expectCss('content.highlightBackground','#abcdef','.rp-highlight','backgroundColor','rgb(171, 205, 239)');
    await expectCss('content.highlightSize',17,'.rp-highlight','fontSize','17px');
    await expectCss('content.highlightPadding',10,'.rp-highlight','paddingTop','10px');
    await expectCss('content.highlightRadius',12,'.rp-highlight','borderRadius','12px');
    await set('ranks.top1.badge.stacked',true); await set('ranks.top1.badge.text','TOP {rank:02}');
    assert.equal(await page.locator('.audit-display '+badge+' .rp-badge-digit').innerText(),'01'); checks++;
    await expectCss('ranks.top1.badge.labelSize',12,badge+' .rp-badge-prefix','fontSize','12px');
    await expectCss('ranks.top1.badge.numberSize',28,badge+' .rp-badge-digit','fontSize','28px');
    await set('panel.color','#ddeeff'); await set('panelPadding',16);
    assert.equal(await css('.ranking-display','backgroundColor'),'rgb(221, 238, 255)'); assert.equal(await css('.ranking-display','paddingTop'),'16px'); checks+=2;
    await page.evaluate(async()=>{vm.ranking.entity_type='shop';vm.rows=rows.map(row=>({...row,rating_score:4.6,product_count:32,type_name:'综合零售',shop_description:'主营数码与生活家电'}));await Vue.nextTick();});
    await set('cardLayout','shop'); await set('content.showStars',true); await set('content.showType',true); await set('content.showShopDescription',true);
    await page.locator('.audit-display '+card).getByText('4.6分',{exact:true}).waitFor();
    assert.equal(await css(card+' .rp-stars-fill','color'),'rgb(255, 123, 49)'); checks++;
    await expectCss('content.starColor','#123456','.rp-stars-fill','color','rgb(18, 52, 86)');
    await expectCss('content.starEmptyColor','#abcdef','.rp-stars','color','rgb(171, 205, 239)');
    await expectCss('content.starSize',19,'.rp-stars','fontSize','19px');
    assert.equal(await page.locator('.audit-display '+card+' .rp-shop-type').innerText(),'综合零售');
    assert.equal(await page.locator('.audit-display '+card+' .rp-shop-description').innerText(),'主营数码与生活家电'); checks+=2;
    await set('content.showStars',false); assert.equal(await page.locator('.audit-display .rp-shop-rating').count(),0); checks++;
    await page.evaluate(async()=>{reset();await Vue.nextTick();});
    await page.evaluate(async()=>{reset();vm.gallery=styleModule.rankingPresets.map(p=>({name:p.name+' · 示例',config:makeConfig('marketingRanking',{limit:4,showMore:false,appearance:styleModule.presetPresentation(p.id)}),...(p.id==='review'?{ranking:{name:'店铺口碑 TOP 榜',description:'近30天店铺榜 · 示例数据',entity_type:'shop'},rows:rows.map((row,i)=>({...row,name:['数码生活店','智能穿戴专营店','手机数码店','家用电器店','平板配件店'][i],rating_score:4.8-i/10,product_count:32+i*6,type_name:['数码家电','智能穿戴','手机通讯','生活电器','数码配件'][i]}))}:{} )}));vm.mode='gallery';await Vue.nextTick();});
    await page.screenshot({path:path.join(out,'ranking-presets.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: '+checks+' rendered attribute checks, isolated TOP1/2/3/range styles, preset undo, real controls, and persistence round-trip');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
