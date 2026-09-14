<template><merchant-settings :config="config" /></template>
<script>
import MerchantSettings from '@/components/merchantDecoration/Settings';
export default {
  name: 'c_shop_info',
  componentsName: 'shop_info',
  cname: '店铺信息',
  components: { MerchantSettings },
  props: ['num', 'activeIndex'],
  computed: {
    config() {
      return this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
