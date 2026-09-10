<template><div class="action-buttons-preview">
  <div v-for="(button, index) in buttons.filter(item => item.enabled !== false)" :key="index" class="action-preview" :class="{ 'action-text-only': !button.icon && !button.image }"
    :style="{ color: config.color, background: config.background, borderRadius: config.radius + 'px' }">
    <img v-if="button.image" :src="imageUrl(button.image)" :style="{width: config.iconSize + 'px', height: config.iconSize + 'px'}" />
    <i v-else-if="button.icon" class="mb-iconfont" :class="buttonIcon(button)" :style="{ fontSize: config.iconSize + 'px', width: config.iconSize + 'px', height: config.iconSize + 'px' }"></i>
    <span v-if="button.showLabel">{{ button.label }}</span>
  </div>
</div></template>
<script>
import setting from '@/setting';
import { actionIcon } from '../../../../shared/pageActions';
export default { props: { buttons: { type: Array, default: () => [] }, config: Object }, methods: {
  buttonIcon: actionIcon,
  imageUrl(url) { return url && url.startsWith('/') ? setting.apiBaseURL.replace(/\/(?:adminapi|api)\/?$/, '') + url : url; },
} };
</script>
<style scoped>
.action-buttons-preview { display:flex; align-items:center; gap:4px; flex-shrink:0; }
.action-preview { display:flex; align-items:center; justify-content:center; flex-direction:column; min-width:30px; min-height:34px; padding:2px; box-sizing:border-box; line-height:1; }
.action-preview i{display:block;flex-shrink:0;line-height:1;text-align:center}.action-preview img{object-fit:contain;flex-shrink:0}.action-preview span{font-size:10px;line-height:10px;white-space:nowrap}.action-preview.action-text-only span{font-size:14px;line-height:20px}
</style>
