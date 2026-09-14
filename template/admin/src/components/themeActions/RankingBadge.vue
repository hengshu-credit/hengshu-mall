<template><span v-if="badge.visible" class="rp-badge" :style="style"><img v-if="badge.shape === 'image' && badge.customImage && !failed" class="rp-badge-image" :src="imageUrl(badge.customImage)" alt="" @error="failed = true" /><span v-if="badge.shape !== 'image' || badge.showText || !badge.customImage || failed" class="rp-badge-text"><template v-if="badge.stacked"><span v-if="parts.prefix" class="rp-badge-prefix" :style="{fontSize: px(badge.labelSize)}">{{ parts.prefix }}</span><span class="rp-badge-digit" :style="{fontSize: px(badge.numberSize)}">{{ parts.number }}</span></template><template v-else>{{ label }}</template></span></span></template>
<script>
import { badgeStyle, badgeLabel, badgeParts, dimension } from '../../../../shared/rankingPresentation';
import setting from '@/setting';
const imageUrl = url => url && url.startsWith('/') ? setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/, '') + url : url;
export default { props: ['badge', 'rank'], data() { return { failed: false }; }, computed: { style() { return badgeStyle(this.badge, 'px', imageUrl); }, label() { return badgeLabel(this.badge, this.rank); }, parts() { return badgeParts(this.badge,this.rank); } }, watch: { 'badge.customImage'() { this.failed = false; } }, methods: { imageUrl, px(value) { return dimension(value, 'px'); } } };
</script>
