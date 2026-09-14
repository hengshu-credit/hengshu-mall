<template><merchant-settings :config="config" /></template>
<script>
import MerchantSettings from '@/components/merchantDecoration/Settings';
export default {
  name: 'c_shop_street',
  componentsName: 'shop_street',
  cname: '店铺街',
  components: { MerchantSettings },
  props: ['num', 'activeIndex'],
  computed: {
    config() {
      return this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
