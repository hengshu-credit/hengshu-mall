<template><div class="rank-tier-settings"><div class="rank-part-title">名次标识</div><ranking-fields :value="value.badge" :fields="badgeFields" /><template v-if="value.badge.visible && value.badge.shape !== 'text'"><div class="rank-part-title">名次标识背景与边框</div><ranking-fields :value="value.badge" :fields="surfaceFields" /></template><div class="rank-part-title">此名次卡片背景与边框</div><ranking-fields :value="value.card" :fields="surfaceFields" /><div class="rank-part-title">此名次文字颜色</div><ranking-fields :value="value" :fields="rankTextFields" :context="context" /></div></template>
<script>
import RankingFields from './RankingFields';
import { badgeFields, surfaceFields, rankTextFields } from './rankingControls';
export default { components: { RankingFields }, props: ['value', 'context'], data() { return { badgeFields, surfaceFields, rankTextFields }; } };
</script>
<style scoped>.rank-part-title{border-left:3px solid #cb9955;padding-left:8px;color:#545b67;font-size:12px;font-weight:600;margin:8px 0 15px}</style>
