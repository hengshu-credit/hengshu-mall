<template><div v-if="config" :style="styles.outer"><div :style="styles.inner"><page-title-preview :style="{color: config.textColor}" :title="config.title" :actions="config.headerActions" /></div></div></template>
<script>
import PageTitlePreview from '@/components/themeActions/PageTitlePreview';
import { pageTitleComponent } from '../../../../shared/pageTitleComponent';
import { componentStyle } from '../../../../shared/componentStyle';
import setting from '@/setting';
export default {
  name: 'page_title_bar', cname: '页面标题', configName: 'c_page_title_bar',
  icon: '#iconzujian-biaoti', type: 0, defaultName: 'pageTitleBar',
  components: { PageTitlePreview }, props: ['num', 'index', 'colorStyle', 'dataConfig'],
  data() { return { defaultConfig: pageTitleComponent({}, this.num) }; },
  computed: {
    config() { return this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num]; },
    styles() {
      const styles = componentStyle(this.config, 'px', url => url && url.startsWith('/') ? setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/, '') + url : url);
      styles.inner.color = this.config.textColor;
      return styles;
    },
  },
};
</script>
