<template><merchant-preview v-if="config" :config="config" :colorStyle="colorStyle" /></template>
<script>
import MerchantPreview from '@/components/merchantDecoration/Preview';
import { merchantComponent } from '../../../../shared/merchantDecoration';
export default {
  name: 'product_ranking',
  cname: '排行榜',
  configName: 'c_product_ranking',
  icon: '#iconzujian-paihangbang',
  type: 0,
  defaultName: 'productRanking',
  components: { MerchantPreview },
  props: ['num', 'index', 'colorStyle', 'dataConfig'],
  data() {
    return { defaultConfig: merchantComponent('productRanking', {}, this.num) };
  },
  computed: {
    config() {
      return this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
