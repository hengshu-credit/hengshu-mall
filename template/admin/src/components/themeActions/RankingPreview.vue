<template>
  <div v-if="!detail || !liveProductPreview || detailRows.length" class="ranking-preview" :style="[styles.outer,themeStyle]"><div class="component-surface" :style="styles.inner">
    <ranking-detail-display v-if="detail" :config="config" :rows="detailRows" />
    <ranking-display v-else :config="config" :ranking="demo ? sampleRanking : ranking" :rows="demo ? sampleRows : list" :active-board-id="activeId" @canvas-action="canvasAction" :loading="!demo && loading" :error="!demo ? error : ''" @retry="load" />
  </div></div>
</template>
<script>
import {editorThemeColors} from '../../../../shared/themeColors';
import { componentStyle } from '../../../../shared/componentStyle';
import { rankingInfo, rankingPreview, rankingOptions } from '@/api/ranking';
import productPhoto from '@/assets/images/product-diy.png';
import RankingDisplay from './RankingDisplay';
import RankingDetailDisplay from './RankingDetailDisplay';
import setting from '@/setting';
import productPreview from '@/mixins/productPreview';
import {highestProductRanking} from '../../../../shared/productRankingInfo';
export default {
  mixins:[productPreview],
  components: { RankingDisplay, RankingDetailDisplay }, props: { config: { type: Object, default: () => ({}) }, detail: Boolean, colorStyle: { type: Object, default: () => ({}) } },
  data() { return { selectedBoard:0, ranking: {}, list: [], samples: [], loading: false, error: '', requestId: 0, demo: !this.config.rankingId, disposed: false }; },
  computed: {
    activeId(){return Number(this.selectedBoard||this.config.rankingId||0);},
    styles() { return componentStyle(this.config, 'px', url => url && url.startsWith('/') ? setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/, '') + url : url); },
    themeStyle() { return editorThemeColors(this.colorStyle); },
    sampleRanking() { const type = this.ranking.entity_type || (this.config.appearance.cardLayout === 'shop' ? 'shop' : 'product'); return { name: this.ranking.name || (type === 'shop' ? '店铺 TOP 榜' : '商品排行榜'), description: this.ranking.description || '', entity_type: type, page_url: '/example' }; },
    sampleRows() { const photos = this.samples.length ? this.samples : [{ name: '美的多段控温电热水壶', price: '129.00', image: productPhoto }]; return Array.from({ length: Math.min(100, this.config.limit || 10) }, (_, i) => ({ ...photos[i % photos.length], id: i + 1, rank: i + 1, sales: 680 - i * 3, reviews: 120 - i, rating: 98 - i / 10, rating_score: Math.max(4, 4.8 - i * 0.05), score: 98 - i / 2, ...(this.sampleRanking.entity_type === 'shop' ? { name: (this.list[i] || {}).name || ['数码生活店','家用电器店','智能穿戴店','手机数码店','生活百货店'][i % 5], image: (this.list[i] || {}).image || photos[i % photos.length].image, type_name: '综合零售', product_count: 25 + i, products: [0,1,2].map(j=>({...photos[j%photos.length],id:j+1,sales:100+j*20,reviews:30+j})) } : { image: productPhoto }) })); },
    detailRows() { if(this.liveProductPreview){const best=highestProductRanking(this.previewDetail.previewRankings||[]);return best?[best]:[];}return [{id:1,rank:2,name:'紧致抗皱套装',entity_type:'product'}]; },
  },
  created() { if (!this.detail) rankingOptions({ type: 'product', page: 1, limit: 10 }).then(res => { if (!this.disposed) this.samples = res.data.list.filter(item => item.image).map(item => ({ name: item.name, image: item.image, price: item.price })); }).catch(() => {}); },
  watch: { 'config.rankingId': { immediate: true, handler() { this.demo = !this.config.rankingId; this.selectedBoard=0;this.load(); } } }, beforeDestroy() { this.requestId++; this.disposed = true; },
  methods: { canvasAction(event){if(event.action==='tab'){this.selectedBoard=event.rankingId;this.demo=false;this.load();}else if(event.action==='rules')this.$alert(this.ranking.description||'按营销配置中的筛选条件和指标排序','榜单规则');}, async load() { const id = ++this.requestId; this.list = []; this.ranking = {}; this.error = ''; this.loading = false; if (this.detail || !this.activeId) return; this.loading = true; try { const rule = (await rankingInfo(this.activeId)).data; const res = await rankingPreview(rule); if (id === this.requestId) { this.ranking = rule; this.list = res.data.list; } } catch (e) { if (id === this.requestId) this.error = e.msg || '预览暂不可用'; } finally { if (id === this.requestId) this.loading = false; } } },
};
</script>

