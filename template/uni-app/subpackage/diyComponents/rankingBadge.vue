<template><view v-if="badge.visible" class="rp-badge" :style="style"><image v-if="badge.shape === 'image' && badge.customImage && !failed" class="rp-badge-image" :src="imageUrl(badge.customImage)" mode="aspectFit" @error="failed = true" /><text v-if="badge.shape !== 'image' || badge.showText || !badge.customImage || failed" class="rp-badge-text"><template v-if="badge.stacked"><text v-if="parts.prefix" class="rp-badge-prefix" :style="{fontSize: px(badge.labelSize)}">{{ parts.prefix }}</text><text class="rp-badge-digit" :style="{fontSize: px(badge.numberSize)}">{{ parts.number }}</text></template><template v-else>{{ label }}</template></text></view></template>
<script>
import { badgeStyle, badgeLabel, badgeParts, dimension } from '../../../shared/rankingPresentation';
import { HTTP_REQUEST_URL } from '@/config/app';
const imageUrl = url => url && url.startsWith('/') ? HTTP_REQUEST_URL + url : url;
export default { props: ['badge', 'rank'], data() { return { failed: false }; }, computed: { style() { return badgeStyle(this.badge, 'rpx', imageUrl); }, label() { return badgeLabel(this.badge, this.rank); }, parts() { return badgeParts(this.badge,this.rank); } }, watch: { 'badge.customImage'() { this.failed = false; } }, methods: { imageUrl, px(value) { return dimension(value, 'rpx'); } } };
</script>
