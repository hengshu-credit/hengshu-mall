<template><ranking-preview v-if="config" :config="config" :colorStyle="colorStyle" /></template>
<script>
import RankingPreview from '@/components/themeActions/RankingPreview';
import { rankingComponent } from '../../../../shared/rankingComponent';
export default {
  name: 'home_marketing_ranking', cname: '营销排行榜', configName: 'c_marketing_ranking', icon: '#iconzujian-paihangbang', type: 1, defaultName: 'marketingRanking',
  components: { RankingPreview }, props: ['num', 'index', 'dataConfig', 'colorStyle'],
  data() { return { defaultConfig: rankingComponent('marketingRanking', {}, this.num) }; },
  computed: { config() { const value = this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num]; return value && rankingComponent('marketingRanking', value, this.num); } },
};
</script>
