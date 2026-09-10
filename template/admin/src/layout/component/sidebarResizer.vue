<template>
  <div
    class="sidebar-resizer"
    :class="{ 'is-resizing': resizing }"
    role="separator"
    tabindex="0"
    aria-orientation="vertical"
    :aria-label="$t('message.layout.resizeSidebar')"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="width"
    :title="$t('message.layout.resizeSidebar')"
    @pointerdown="startResize"
    @lostpointercapture="finishResize"
    @keydown="onKeydown"
  ></div>
</template>

<script>
export default {
  name: 'sidebarResizer',
  props: {
    width: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  data() {
    return {
      resizing: false,
      pointerId: null,
      startX: 0,
      startWidth: 0,
      currentWidth: 0,
      previousCursor: '',
      previousUserSelect: '',
    };
  },
  beforeDestroy() {
    this.finishResize();
  },
  methods: {
    clamp(width) {
      return Math.min(this.max, Math.max(this.min, Math.round(width)));
    },
    startResize(event) {
      if (event.button !== 0 || this.resizing) return;
      event.preventDefault();
      this.resizing = true;
      this.pointerId = event.pointerId;
      this.startX = event.clientX;
      this.startWidth = this.width;
      this.currentWidth = this.width;
      this.previousCursor = document.body.style.cursor;
      this.previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      this.$el.setPointerCapture(event.pointerId);
      window.addEventListener('pointermove', this.handleResize);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.finishResize);
      window.addEventListener('blur', this.finishResize);
      this.$emit('resizing', true);
    },
    handleResize(event) {
      if (!this.resizing || event.pointerId !== this.pointerId) return;
      this.currentWidth = this.clamp(this.startWidth + event.clientX - this.startX);
      this.$emit('resize', this.currentWidth);
    },
    onPointerUp(event) {
      if (event.pointerId !== this.pointerId) return;
      this.handleResize(event);
      this.finishResize();
    },
    finishResize() {
      if (!this.resizing) return;
      this.resizing = false;
      window.removeEventListener('pointermove', this.handleResize);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('pointercancel', this.finishResize);
      window.removeEventListener('blur', this.finishResize);
      if (this.$el.hasPointerCapture(this.pointerId)) this.$el.releasePointerCapture(this.pointerId);
      this.pointerId = null;
      document.body.style.cursor = this.previousCursor;
      document.body.style.userSelect = this.previousUserSelect;
      this.$emit('resize-end', this.currentWidth);
      this.$emit('resizing', false);
    },
    onKeydown(event) {
      const widths = { ArrowLeft: this.width - 10, ArrowRight: this.width + 10, Home: this.min, End: this.max };
      if (widths[event.key] === undefined) return;
      event.preventDefault();
      this.$emit('resize-end', this.clamp(widths[event.key]));
    },
  },
};
</script>

<style lang="scss" scoped>
.sidebar-resizer {
  position: absolute;
  z-index: 5;
  top: 0;
  right: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  touch-action: none;

  &::after {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 2px;
    content: '';
    background: transparent;
  }

  &:hover::after,
  &:focus-visible::after,
  &.is-resizing::after {
    background: var(--prev-color-primary);
  }
}
</style>
