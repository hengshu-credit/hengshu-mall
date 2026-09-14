<template><ranking-settings :num="num" detail /></template>
<script>
import RankingSettings from '@/components/themeActions/RankingSettings';
export default {
  name: 'c_product_rank',
  componentsName: 'product_rank',
  cname: '排行榜',
  components: { RankingSettings },
  props: ['num', 'activeIndex'],
  computed: {
    config() {
      return this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
