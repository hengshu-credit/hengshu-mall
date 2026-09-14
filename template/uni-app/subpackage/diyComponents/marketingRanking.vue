<template><common-wrapper v-if="!config.isHide && (config.appearance.canvas.enabled || !(config.appearance.empty.hide && !loading && !error && !list.length))" :config="config"><ranking-display :config="config" :ranking="ranking" :rows="list" :active-board-id="activeId" @canvas-action="canvasAction" :loading="loading" :error="error" @more="more" @retry="load" @open="open" /></common-wrapper></template>
<script>
import commonWrapper from './commonWrapper.vue';
import RankingDisplay from './rankingDisplay.vue';
import { rankingComponent } from '../../../shared/rankingComponent';
import { getMarketingRanking } from '@/api/ranking';
export default {
  components: { commonWrapper, RankingDisplay }, props: { dataConfig: { type: Object, default: () => ({}) } },
  data() { return { selectedBoard:0, ranking: {}, list: [], loading: false, error: '', calculatedAt: 0, requestId: 0 }; },
  computed: { viewerKey(){const app=this.$store&&this.$store.state.app||{};return [app.uid,app.token].join(':');},activeId(){return Number(this.selectedBoard||this.config.rankingId||((this.config.appearance.canvas.tabs[0]||{}).rankingId)||0);}, config() { return rankingComponent('marketingRanking', this.dataConfig); } },
  watch: { viewerKey(){this.load();},activeId:{immediate:true,handler(){this.load();}},'dataConfig.rankingId'(){this.selectedBoard=0;},'dataConfig.isHide'(){this.load();} },
  beforeDestroy() { this.requestId++; },
  methods: {
    canvasAction(event){if(event.action==='tab'){this.selectedBoard=event.rankingId;}else if(event.action==='rules')uni.showModal({title:'榜单规则',content:this.ranking.description||'按后台配置的筛选条件和指标排序',showCancel:false});else if(event.action==='back')uni.navigateBack();else if(event.action==='ranking')this.more();else if(event.action==='product'&&event.item.id)uni.navigateTo({url:'/pages/goods_details/index?id='+event.item.id});else if(event.action==='shop'&&event.item.id)uni.navigateTo({url:'/pages/merchant/shop?id='+event.item.id});else if(event.action==='link'&&/^\/pages\//.test(event.link))uni.navigateTo({url:event.link});},
    async load() { const id = ++this.requestId; this.list = []; this.ranking = {}; this.error = ''; this.calculatedAt = 0; if (!this.activeId || this.config.isHide) { this.loading = false; return; } this.loading = true; try { const res = await getMarketingRanking(this.activeId); if (id === this.requestId) { this.ranking = res.data.ranking; this.list = res.data.list; this.calculatedAt = res.data.calculated_at; } } catch (e) { if (id === this.requestId) this.error = (e && e.msg) || '榜单暂不可用'; } finally { if (id === this.requestId) this.loading = false; } },
    more() { if (this.ranking.page_url) uni.navigateTo({ url: this.ranking.page_url }); },
    open(item) { uni.navigateTo({ url: this.ranking.entity_type === 'product' ? '/pages/goods_details/index?id=' + item.id : '/pages/merchant/shop?id=' + item.id }); },
  },
};
</script>
