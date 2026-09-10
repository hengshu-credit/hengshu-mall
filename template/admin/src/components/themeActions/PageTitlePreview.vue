<template>
  <div class="page-title-preview">
    <action-buttons-preview class="title-left-actions" :buttons="actions.left" :config="actions" />
    <span class="page-title-text">{{ title }}</span>
    <action-buttons-preview class="title-right-actions" :buttons="actions.right" :config="actions" />
  </div>
</template>
<script>
import ActionButtonsPreview from './ActionButtonsPreview';
export default { components: { ActionButtonsPreview }, props: { title: String, actions: Object } };
</script>
<style scoped>
.page-title-preview{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr);align-items:center;min-height:44px;padding:0 8px;box-sizing:border-box}
.page-title-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font-size:15px;line-height:44px}
.title-left-actions{justify-content:flex-start;min-width:0;overflow:hidden}.title-right-actions{justify-content:flex-end;min-width:0;overflow:hidden}
.page-title-preview ::v-deep .action-preview{min-width:0;flex-shrink:1}.page-title-preview ::v-deep .action-preview span{max-width:100%;overflow:hidden;text-overflow:ellipsis}
</style>
