<template><merchant-preview v-if="config" :config="config" :colorStyle="colorStyle" /></template>
<script>
import MerchantPreview from '@/components/merchantDecoration/Preview';
import { merchantComponent } from '../../../../shared/merchantDecoration';
export default {
  name: 'shop_header',
  cname: '店铺页头',
  configName: 'c_shop_header',
  icon: '#iconzujian-zuhezujian',
  type: 5,
  defaultName: 'shopHeader',
  components: { MerchantPreview },
  props: ['num', 'index', 'colorStyle', 'dataConfig'],
  data() {
    return { defaultConfig: merchantComponent('shopHeader', {}, this.num) };
  },
  computed: {
    config() {
      return this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
