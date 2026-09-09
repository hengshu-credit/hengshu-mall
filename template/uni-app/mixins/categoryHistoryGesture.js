// Browser history belongs to H5; other clients keep their native navigation gestures.
export default {
  mounted() { this.installCategoryHistoryGesture(); },
  beforeDestroy() { if (this._removeHistoryGesture) this._removeHistoryGesture(); },
  onShow() { this._historyGestureActive = true; },
  onHide() { this._historyGestureActive = false; this._historyTouch = null; },
  methods: {
    installCategoryHistoryGesture() {
      // #ifdef H5
      const root = this.$el;
      this._historyGestureActive = true;
      let suppressClickUntil = 0;
      const cancel = () => { this._historyTouch = null; };
      const start = event => {
        cancel();
        if (!this._historyGestureActive || event.touches.length !== 1) return;
        // Keep horizontal category tabs, form controls and modal interactions local.
        if (event.target.closest('input, textarea, button, select, uni-slider, uni-swiper, .longTab, .downTab, .mask, .product-window, .cartList')) return;
        const touch = event.touches[0];
        this._historyTouch = { x: touch.clientX, y: touch.clientY, time: Date.now(), horizontal: false };
      };
      const move = event => {
        const start = this._historyTouch;
        if (!start) return;
        if (event.touches.length !== 1) return cancel();
        const dx = event.touches[0].clientX - start.x;
        const dy = event.touches[0].clientY - start.y;
        if (!start.horizontal && Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) return cancel();
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) start.horizontal = true;
        if (start.horizontal && event.cancelable) event.preventDefault();
      };
      const end = event => {
        const start = this._historyTouch;
        cancel();
        if (!start || !start.horizontal || !event.changedTouches.length) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
        if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - start.time > 1000) return;
        suppressClickUntil = Date.now() + 400;
        if (event.cancelable) event.preventDefault();
        window.history.go(dx > 0 ? 1 : -1);
      };
      const click = event => {
        if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
      };
      const handlers = { touchstart: start, touchmove: move, touchend: end, touchcancel: cancel, click };
      Object.keys(handlers).forEach(name => root.addEventListener(name, handlers[name], { capture: true, passive: false }));
      this._removeHistoryGesture = () => {
        Object.keys(handlers).forEach(name => root.removeEventListener(name, handlers[name], true));
        cancel();
      };
      // #endif
    },
  },
};
