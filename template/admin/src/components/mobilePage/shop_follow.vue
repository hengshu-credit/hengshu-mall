<template><merchant-preview v-if="config" :config="config" :colorStyle="colorStyle" /></template>
<script>
import MerchantPreview from '@/components/merchantDecoration/Preview';
import { merchantComponent } from '../../../../shared/merchantDecoration';
export default {
  name: 'shop_follow',
  cname: '关注店铺',
  configName: 'c_shop_follow',
  icon: '#iconzujian-youpintuijian',
  type: 5,
  defaultName: 'shopFollow',
  components: { MerchantPreview },
  props: ['num', 'index', 'colorStyle', 'dataConfig'],
  data() {
    return { defaultConfig: merchantComponent('shopFollow', {}, this.num) };
  },
  computed: {
    config() {
      return this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
