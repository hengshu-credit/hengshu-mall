<template>
  <div class="editor-module-frame" :class="{selected,hidden}" @click.stop="$emit('select')">
    <slot />
    <span class="module-selection" data-editor-chrome aria-hidden="true"></span>
    <span class="module-name" data-editor-chrome>{{name}}</span>
    <component-toolbar class="module-tools" :name="name" :hidden="hidden" :canHide="canHide" :canDelete="canDelete"
      :canMoveUp="canMoveUp" :canMoveDown="canMoveDown" :moveHint="moveHint"
      @toggle="$emit('toggle')" @remove="$emit('remove')" @copy="$emit('copy')" @move="$emit('move', $event)" @select="$emit('select')" />
  </div>
</template>
<script>
import ComponentToolbar from './ComponentToolbar';
export default {components:{ComponentToolbar},props:{name:String,selected:Boolean,hidden:Boolean,canHide:{type:Boolean,default:true},canDelete:{type:Boolean,default:true},canMoveUp:Boolean,canMoveDown:Boolean,moveHint:String}};
</script>
<style scoped lang="scss">
.editor-module-frame {
  position:relative;
  isolation:isolate;
  display:flow-root;
  min-height:44px;
  cursor:pointer;
  flex-shrink:0;
  &.selected{z-index:2}
  .module-selection{position:absolute;inset:0;box-sizing:border-box;border:2px solid transparent;pointer-events:none;z-index:9999}
  &:hover .module-selection{border-color:var(--prev-color-primary);border-style:dashed}
  &.selected .module-selection{border-color:var(--prev-color-primary);border-style:solid}
  .module-name{position:absolute;left:-100px;top:6px;width:86px;height:32px;line-height:32px;text-align:center;background:#fff;border-radius:3px;font-size:13px;color:#666;white-space:nowrap;z-index:10000;
    &::before{content:'';position:absolute;right:-5px;top:11px;width:10px;height:10px;transform:rotate(45deg);background:inherit}
  }
  &.selected .module-name{background:var(--prev-color-primary-light-3,var(--prev-color-primary));color:#fff}
  .module-tools{display:none}
  &.selected .module-tools{display:block}
  &.hidden::before{content:'已隐藏';position:absolute;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);color:#fff;pointer-events:none}
}
</style>
