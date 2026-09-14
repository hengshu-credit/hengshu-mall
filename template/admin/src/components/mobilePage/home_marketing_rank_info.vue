<template><ranking-preview v-if="config" :config="config" :colorStyle="colorStyle" detail /></template>
<script>
import RankingPreview from '@/components/themeActions/RankingPreview';
import { rankingComponent } from '../../../../shared/rankingComponent';
export default {
  name: 'home_marketing_rank_info', cname: '商品上榜信息', configName: 'c_marketing_rank_info', icon: '#iconzujian-paihangbang', type: 3, defaultName: 'marketingRankInfo',
  components: { RankingPreview }, props: ['num', 'index', 'dataConfig', 'colorStyle'],
  data() { return { defaultConfig: rankingComponent('marketingRankInfo', {}, this.num) }; },
  computed: { config() { const value = this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num]; return value && rankingComponent('marketingRankInfo', value, this.num); } },
};
</script>
