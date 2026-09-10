<template><view v-if="config.banner_enabled && config.banner_image" class="category-banner" @click="open"><image :src="config.banner_image" mode="widthFix" @load="$emit('load')" /></view></template>
<script>
import { categoryLink, openCategoryPage, CATEGORY_PAGE } from '@/utils/categoryNavigation.js';
export default {
  props: { config: { type: Object, required: true } },
  methods: { open() {
    const link = this.config.banner_link || '';
    if (!/^\/pages\//.test(link)) return;
    const { pathname, options } = categoryLink(link);
    if (pathname === CATEGORY_PAGE) return openCategoryPage(options);
    uni.navigateTo({ url: link, fail: () => uni.switchTab({ url: pathname }) });
  } },
};
</script>
<style scoped>.category-banner { padding: 16rpx; }.category-banner image { display: block; width: 100%; }</style>
