<template>
  <div class="editor-module-frame" :class="{selected,hidden}" @click.stop="$emit('select')">
    <slot />
    <span class="module-selection" data-editor-chrome aria-hidden="true"></span>
    <span class="module-name" data-editor-chrome>{{name}}</span>
    <div class="module-tools" data-editor-chrome>
      <button v-if="canHide" @click.stop="$emit('toggle')" :aria-label="(hidden ? '显示' : '隐藏')+name"><i class="iconfont" :class="hidden ? 'iconyincang' : 'iconxianshi'"></i></button>
      <button v-if="canDelete" @click.stop="$emit('remove')" :aria-label="'删除'+name"><i class="iconfont iconshanchu3"></i></button>
      <button v-if="!canHide && !canDelete" @click.stop="$emit('select')" :aria-label="'配置'+name"><i class="el-icon-edit"></i></button>
    </div>
  </div>
</template>
<script>
export default {props:{name:String,selected:Boolean,hidden:Boolean,canHide:{type:Boolean,default:true},canDelete:{type:Boolean,default:true}}};
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
  .module-tools{display:none;position:absolute;left:calc(100% + 8px);top:0;width:36px;padding:0;border-radius:4px;background:var(--prev-color-primary);color:#fff;z-index:10000;
    button{display:block;width:100%;border:0;padding:2px 0;height:20px;line-height:18px;background:transparent;color:inherit;font-size:16px;cursor:pointer;&:hover{background:rgba(255,255,255,.15)}}
  }
  &.selected .module-tools{display:block}
  &.hidden::before{content:'已隐藏';position:absolute;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);color:#fff;pointer-events:none}
}
</style>
