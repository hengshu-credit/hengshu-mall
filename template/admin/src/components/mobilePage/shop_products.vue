<template><merchant-preview v-if="config" :config="config" :colorStyle="colorStyle" /></template>
<script>
import MerchantPreview from '@/components/merchantDecoration/Preview';
import { merchantComponent } from '../../../../shared/merchantDecoration';
export default {
  name: 'shop_products',
  cname: '店铺商品',
  configName: 'c_shop_products',
  icon: '#iconzujian-shangpinliebiao',
  type: 5,
  defaultName: 'shopProducts',
  components: { MerchantPreview },
  props: ['num', 'index', 'colorStyle', 'dataConfig'],
  data() {
    return { defaultConfig: merchantComponent('shopProducts', {}, this.num) };
  },
  computed: {
    config() {
      return this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
