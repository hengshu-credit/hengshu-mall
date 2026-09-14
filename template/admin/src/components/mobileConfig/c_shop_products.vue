<template><merchant-settings :config="config" /></template>
<script>
import MerchantSettings from '@/components/merchantDecoration/Settings';
export default {
  name: 'c_shop_products',
  componentsName: 'shop_products',
  cname: '店铺商品',
  components: { MerchantSettings },
  props: ['num', 'activeIndex'],
  computed: {
    config() {
      return this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
