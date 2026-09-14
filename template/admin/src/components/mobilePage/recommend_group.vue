<template><merchant-preview v-if="config" :config="config" :colorStyle="colorStyle" /></template>
<script>
import MerchantPreview from '@/components/merchantDecoration/Preview';
import { merchantComponent } from '../../../../shared/merchantDecoration';
export default {
  name: 'recommend_group',
  cname: '推荐组',
  configName: 'c_recommend_group',
  icon: '#iconzujian-tuijianzu',
  type: 0,
  defaultName: 'recommendGroup',
  components: { MerchantPreview },
  props: ['num', 'index', 'colorStyle', 'dataConfig'],
  data() {
    return { defaultConfig: merchantComponent('recommendGroup', {}, this.num) };
  },
  computed: {
    config() {
      return this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
