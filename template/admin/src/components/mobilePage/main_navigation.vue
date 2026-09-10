<template><navigation-preview v-if="config" :config="config" :themeColor="colorStyle && colorStyle.theme" /></template>
<script>
import NavigationPreview from '@/components/themeNavigation/NavigationPreview';
import { navigationComponent } from '../../../../shared/navigationComponent';
export default {
  name: 'main_navigation',
  cname: '导航栏',
  configName: 'c_main_navigation',
  icon: '#iconzujian-dibucaidan',
  type: 0,
  defaultName: 'mainNavigation',
  components: { NavigationPreview },
  props: ['num', 'index', 'colorStyle'],
  data() {
    return { defaultConfig: navigationComponent({}, this.num) };
  },
  computed: {
    config() {
      return this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
