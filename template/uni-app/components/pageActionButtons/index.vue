<template><view class="page-action-buttons">
  <button v-for="(action,index) in buttons.filter(item => item.enabled !== false)" :key="index" class="page-action-button" :class="{'text-only': !action.image && !action.icon}"
    :aria-label="action.label" :disabled="disabled(action)" :style="buttonStyle" @click.stop="activate(action)">
    <image v-if="action.image" :src="imageUrl(action.image)" mode="aspectFit" :style="iconStyle" />
    <text v-else-if="action.icon" class="iconfont" :class="action.type === 'collect' && product.userCollect ? 'icon-shoucang1' : buttonIcon(action)" :style="iconStyle" />
    <text v-if="action.showLabel" class="action-label">{{ $t(action.label) }}</text>
  </button>
</view></template>
<script>
import { actionDisabled, actionLink, actionIcon } from '../../../shared/pageActions';
import { getCustomer } from '@/utils/index.js';
import { HTTP_REQUEST_URL } from '@/config/app';
export default { props: { buttons: { type: Array, default: () => [] }, config: { type: Object, default: () => ({}) }, product: { type: Object, default: () => ({}) } },
  computed: {
    buttonStyle() { return { color: this.config.color || '#333', background: this.config.background || 'transparent', borderRadius: (this.config.radius || 0) * 2 + 'rpx' }; },
    iconStyle() { const size = (this.config.iconSize || 20) * 2 + 'rpx'; return { fontSize: size, width: size, height: size, lineHeight: size }; },
  },
  methods: {
    buttonIcon: actionIcon,
    disabled(action) { return actionDisabled(action, this.product); },
    imageUrl(url) { return url && url.startsWith('/') && !url.startsWith('/static/') ? HTTP_REQUEST_URL + url : url; },
    activate(action) {
      if (this.disabled(action)) return;
      if (action.type === 'cartManage') return this.$emit('action', action.type);
      if (action.type === 'collect' || (action.type === 'share' && this.product.id)) return this.$emit('action', action.type);
      if (action.type === 'back') return uni.navigateBack({ fail: () => this.$util.JumpPath('/pages/index/index') });
      if (action.type === 'customer') return getCustomer('/pages/extension/customer_list/chat' + (this.product.id ? '?productId=' + this.product.id : ''));
      if (action.type === 'scan') return uni.scanCode ? uni.scanCode({ success: result => { const link = actionLink({type:'link',link:result.result}); if (link) this.$util.JumpPath(link); } }) : uni.showToast({ title: this.$t('当前浏览器不支持扫码'), icon:'none' });
      if (action.type === 'share') {
        const pages = getCurrentPages(), page = pages[pages.length-1];
        const path = page && page.$page && page.$page.fullPath || '/' + (page && page.route || 'pages/index/index');
        return uni.setClipboardData({ data: HTTP_REQUEST_URL + path, success: () => uni.showToast({ title: this.$t('分享链接已复制'), icon:'none' }) });
      }
      const link = actionLink(action);
      if (!link) return;
      if (action.type === 'url') return uni.navigateTo({ url: '/pages/annex/web_view/index?url=' + encodeURIComponent(link) });
      this.$util.JumpPath(link);
    },
  },
};
</script>
<style scoped>
.page-action-buttons{display:flex;align-items:center;gap:8rpx;flex-shrink:0}.page-action-button{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:60rpx;min-height:68rpx;margin:0;padding:4rpx;line-height:1.2;border:0}.page-action-button::after{border:0}.page-action-button[disabled]{opacity:.4}.action-label{font-size:20rpx;white-space:nowrap}.page-action-button image{display:block}
</style>
<style scoped>.action-label{max-width:80rpx;overflow:hidden;text-overflow:ellipsis}.text-only .action-label{font-size:28rpx}</style>
