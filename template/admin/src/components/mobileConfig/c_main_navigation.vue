<template><navigation-settings :configObj="configObj" /></template>
<script>
import NavigationSettings from '@/components/themeNavigation/NavigationSettings';
export default {
  name: 'c_main_navigation',
  componentsName: 'main_navigation',
  cname: '导航栏',
  components: { NavigationSettings },
  props: ['num', 'activeIndex'],
  computed: {
    configObj() {
      return this.$store.state.mobildConfig.defaultArray[this.num];
    },
  },
};
</script>
