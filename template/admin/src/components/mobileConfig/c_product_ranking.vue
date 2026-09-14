<template><merchant-settings :config="config" /></template>
<script>
import MerchantSettings from '@/components/merchantDecoration/Settings';
export default {
  name: 'c_product_ranking',
  componentsName: 'product_ranking',
  cname: '排行榜',
  components: { MerchantSettings },
  props: ['num', 'activeIndex'],
  computed: {
    config() {
      return this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
