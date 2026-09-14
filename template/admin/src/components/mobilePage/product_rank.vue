<template><ranking-preview v-if="config" :config="config" :colorStyle="colorStyle" detail /></template>
<script>
import RankingPreview from '@/components/themeActions/RankingPreview';
import { rankingComponent } from '../../../../shared/rankingComponent';
export default {
  name: 'product_rank',
  cname: '排行榜',
  configName: 'c_product_rank',
  icon: '#iconzujian-paihangbang',
  type: 3,
  defaultName: 'productRank',
  components: { RankingPreview },
  props: ['num', 'index', 'colorStyle', 'dataConfig'],
  data() {
    return { defaultConfig: rankingComponent('productRank', {}, this.num) };
  },
  computed: {
    config() {
      const value = this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num];
      return value && rankingComponent('productRank', value, this.num);
    },
  },
};
</script>
