<template><view :style="styles.outer"><view :style="styles.inner"><page-title-bar background="transparent" :title="config.title" :color="config.textColor" :actions="config.headerActions" :product="product" :managing="managing" @action="$emit('action', $event)" /></view></view></template>
<script>
import PageTitleBar from '@/components/pageTitleBar/index.vue';
import { pageTitleComponent } from '../../../shared/pageTitleComponent';
import { componentStyle } from '../../../shared/componentStyle';
import { HTTP_REQUEST_URL } from '@/config/app';
export default {
  components: { PageTitleBar }, props: { dataConfig: Object, product: Object, managing: Boolean },
  computed: {
    config() { return pageTitleComponent(this.dataConfig || {}); },
    styles() { return componentStyle(this.config, 'rpx', url => url && url.startsWith('/') && !url.startsWith('/static/') ? HTTP_REQUEST_URL + url : url); },
  },
};
</script>
