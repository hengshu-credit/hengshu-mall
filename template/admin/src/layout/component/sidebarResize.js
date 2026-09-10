import { Local } from '@/utils/storage.js';

const WIDTHS = {
  defaults: { initial: 300, min: 180, max: 480 },
  classic: { initial: 180, min: 180, max: 480 },
  columns: { initial: 180, min: 180, max: 480 },
  columnsPrimary: { initial: 70, min: 70, max: 200 },
};

export default {
  data() {
    return { sidebarDragWidth: null, sidebarResizing: false, sidebarActiveKey: null };
  },
  computed: {
    sidebarWidthLimits() {
      return WIDTHS[this.sidebarResizeKey] || WIDTHS.defaults;
    },
    sidebarExpandedWidth() {
      const widths = this.$store.state.themeConfig.themeConfig.sidebarWidths || {};
      const value = this.sidebarDragWidth === null ? widths[this.sidebarResizeKey] : this.sidebarDragWidth;
      const { initial, min, max } = this.sidebarWidthLimits;
      return typeof value === 'number' && Number.isFinite(value)
        ? Math.min(max, Math.max(min, Math.round(value)))
        : initial;
    },
    sidebarWidthStyle() {
      return { '--layout-sidebar-width': `${this.sidebarExpandedWidth}px` };
    },
  },
  methods: {
    onSidebarResizing(resizing) {
      this.sidebarResizing = resizing;
      this.sidebarActiveKey = resizing ? this.sidebarResizeKey : null;
    },
    onSidebarResize(width) {
      this.sidebarDragWidth = width;
    },
    onSidebarResizeEnd(width) {
      const config = this.$store.state.themeConfig.themeConfig;
      // Older saved themes do not have sidebarWidths yet.
      const key = this.sidebarActiveKey || this.sidebarResizeKey;
      this.$set(config, 'sidebarWidths', { ...config.sidebarWidths, [key]: width });
      this.sidebarDragWidth = null;
      try {
        Local.set('themeConfigPrev', config);
      } catch (error) {
        // Keep resizing usable when browser storage is unavailable.
      }
    },
  },
};
