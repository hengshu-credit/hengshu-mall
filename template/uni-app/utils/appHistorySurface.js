// This function is serialized into each APP Vue page's WebView. Keep it self-contained.
export function installHistorySurface(state) {
  if (window.__wuseHistorySurface) return window.__wuseHistorySurface.update(state);
  let navigation = state, touch = null, suppressUntil = 0;
  const blocked = 'input,textarea,select,button,a,[contenteditable="true"],uni-swiper,uni-slider,video,canvas,.longTab,.downTab,.product-window,.cartList,.uni-popup,.tui-drawer-container,.mask';
  function hasOverlay() {
    return Array.prototype.slice.call(document.querySelectorAll('.mask,.product-window.on,.cartList.on,.uni-popup,.tui-drawer-mask'))
      .some(el => el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none');
  }
  function send(direction) {
    if (navigation.busy || (direction < 0 ? !navigation.canBack : !navigation.canForward) || hasOverlay()) return;
    plus.webview.postMessageToUniNView({ type: 'wuse-route-history', direction: direction, pageId: plus.webview.currentWebview().id, requestId: String(Date.now()) + Math.random() }, '__uniapp__service');
  }
  function update(value) { navigation = value; }
  document.addEventListener('touchstart', event => {
    touch = null;
    if (navigation.busy || event.touches.length !== 1 || event.target.closest(blocked) || hasOverlay()) return;
    // Preserve horizontal scroll areas even when they are not a uni-swiper.
    for (let el = event.target; el && el !== document.body; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth + 4 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return;
    }
    const t = event.touches[0];
    touch = { x: t.clientX, y: t.clientY, time: Date.now(), horizontal: false };
  }, { capture: true, passive: true });
  document.addEventListener('touchmove', event => {
    if (!touch) return;
    if (event.touches.length !== 1) { touch = null; return; }
    const dx = event.touches[0].clientX - touch.x, dy = event.touches[0].clientY - touch.y;
    if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { touch = null; return; }
    if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.8) touch.horizontal = true;
    if (touch.horizontal && event.cancelable) event.preventDefault();
  }, { capture: true, passive: false });
  document.addEventListener('touchend', event => {
    const start = touch;
    touch = null;
    if (!start || !start.horizontal || !event.changedTouches.length) return;
    const t = event.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y;
    if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 1.8 || Date.now() - start.time > 900) return;
    suppressUntil = Date.now() + 450;
    if (event.cancelable) event.preventDefault();
    send(dx > 0 ? -1 : 1);
  }, { capture: true, passive: false });
  document.addEventListener('touchcancel', () => { touch = null; }, true);
  document.addEventListener('click', event => {
    if (Date.now() < suppressUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  window.__wuseHistorySurface = { update };
  update(state);
}
