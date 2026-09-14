<template><merchant-settings :config="config" /></template>
<script>
import MerchantSettings from '@/components/merchantDecoration/Settings';
export default {
  name: 'c_shop_header',
  componentsName: 'shop_header',
  cname: '店铺页头',
  components: { MerchantSettings },
  props: ['num', 'activeIndex'],
  computed: {
    config() {
      return this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
