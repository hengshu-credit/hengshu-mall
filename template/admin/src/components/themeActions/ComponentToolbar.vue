<template>
  <div class="component-toolbar handleType" role="toolbar" :aria-label="name + '操作'" data-editor-chrome @mousedown.stop>
    <button v-if="canHide" type="button" class="iconfont" :class="hidden ? 'iconyincang' : 'iconxianshi'"
      :title="hidden ? '显示' : '隐藏'" :aria-label="(hidden ? '显示' : '隐藏') + name" @click.stop="$emit('toggle')"></button>
    <button v-if="canDelete" type="button" class="iconfont iconshanchu3" title="删除" :aria-label="'删除' + name" @click.stop="$emit('remove')"></button>
    <button type="button" class="iconfont icona-fuzhi1" title="复制" :aria-label="'复制' + name" @click.stop="$emit('copy')"></button>
    <button type="button" class="iconfont iconshang" :class="{ on: !canMoveUp }" :disabled="!canMoveUp"
      :title="moveHint || '上移'" :aria-label="'上移' + name" @click.stop="$emit('move', -1)"></button>
    <button type="button" class="iconfont iconxia" :class="{ on: !canMoveDown }" :disabled="!canMoveDown"
      :title="moveHint || '下移'" :aria-label="'下移' + name" @click.stop="$emit('move', 1)"></button>
    <button v-if="!canHide && !canDelete" type="button" class="iconfont iconbianji" title="配置" :aria-label="'配置' + name" @click.stop="$emit('select')"></button>
  </div>
</template>

<script>
export default {
  name: 'ComponentToolbar',
  props: {
    name: { type: String, default: '' },
    hidden: Boolean,
    canHide: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: true },
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    moveHint: String,
  },
};
</script>

<style scoped lang="scss">
// The home editor's toolbar styling is shared by every decoration canvas.
.component-toolbar {
  position: absolute;
  right: -43px;
  top: 0;
  width: 36px;
  padding: 4px 0;
  border: 0;
  border-radius: 4px;
  background-color: var(--prev-color-primary);
  color: #fff;
  font-weight: bold;
  text-align: center;
  cursor: pointer;
  pointer-events: auto;
  z-index: 10000;

  .iconfont {
    display: block;
    width: 100%;
    height: auto;
    margin: 0;
    padding: 5px 0;
    border: 0;
    border-radius: 0;
    appearance: none;
    background: transparent;
    color: #fff;
    font-size: 16px;
    font-weight: inherit;
    line-height: normal;
    text-align: center;
    cursor: pointer;

    &.on { opacity: 0.4; }
    &:disabled { cursor: not-allowed; }
    &:focus-visible { outline: 1px solid #fff; outline-offset: -3px; }
  }
}
</style>
