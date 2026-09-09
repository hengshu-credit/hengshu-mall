import { createRouteHistory } from './appRouteHistory';
import { installHistorySurface } from './appHistorySurface';

const tabs = ['/pages/index/index', '/pages/goods_cate/goods_cate', '/pages/order_addcart/order_addcart', '/pages/user/index'];

export function installAppHistory(Vue) {
  const history = createRouteHistory();
  let pending = null, activeView = null, internalBack = false, lastMessageId = '';
  const original = {};
  ['navigateTo', 'redirectTo', 'switchTab', 'reLaunch', 'navigateBack'].forEach(name => { original[name] = uni[name].bind(uni); });
  function pageUrl(page) {
    if (!page) return '';
    const path = '/' + page.route.replace(/^\//, '');
    const options = page.options || {};
    const query = Object.keys(options).filter(key => !key.startsWith('__')).sort()
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(options[key])).join('&');
    return path + (query ? '?' + query : '');
  }
  function refresh() {
    if (!activeView) return;
    const state = { ...history.snapshot(), busy: !!pending };
    // Do not expose the route list or its query parameters to the view bridge.
    activeView.evalJS('(' + installHistorySurface.toString() + ')(' + JSON.stringify({ canBack: state.canBack, canForward: state.canForward, busy: state.busy }) + ')');
  }
  function finishFailure() { pending = null; internalBack = false; refresh(); }
  function move(delta) {
    if (pending) return;
    const target = history.plan(delta);
    if (!target) return;
    pending = target;
    refresh();
    const pages = getCurrentPages();
    const existing = pages.findIndex(page => pageUrl(page) === target.url);
    const callbacks = {
      success() { if (pending === target) { history.commit(target); pending = null; } internalBack = false; refresh(); },
      fail() { finishFailure(); uni.showToast({ title: '页面打开失败，请重试', icon: 'none' }); },
    };
    if (tabs.includes(target.url.split('?')[0])) {
      original.switchTab({ url: target.url.split('?')[0], ...callbacks });
    } else if (existing >= 0 && existing < pages.length - 1) {
      internalBack = true;
      original.navigateBack({ delta: pages.length - existing - 1, ...callbacks });
    } else {
      const navigate = pages.length >= 8 ? original.redirectTo : original.navigateTo;
      navigate({ url: target.url, animationType: delta < 0 ? 'slide-in-left' : 'slide-in-right', ...callbacks });
    }
  }
  const receiveMessage = event => {
    const message = event && event.data;
    if (!message || message.type !== 'wuse-route-history' || !activeView || String(message.pageId) !== String(activeView.id)) return;
    if (!message.requestId || message.requestId === lastMessageId) return;
    lastMessageId = message.requestId;
    if (message.direction === -1 || message.direction === 1) move(message.direction);
  };
  // Explicit application Back calls (e.g. saving a form) retain their normal callbacks and delta.
  uni.addInterceptor('navigateBack', {
    invoke(options) {
      if (internalBack || options.from === 'backbutton') return;
      const pages = getCurrentPages();
      const page = pages[Math.max(0, pages.length - 1 - (options.delta || 1))];
      pending = history.planTo(pageUrl(page));
      internalBack = true;
      const complete = options.complete;
      options.complete = result => {
        internalBack = false;
        pending = null;
        refresh();
        if (complete) complete(result);
      };
    },
  });
  Vue.mixin({
    onLaunch() {
      // V3 APP service receives WebView messages as native events, before framework dispatch.
      plus.globalEvent.addEventListener('plusMessage', receiveMessage);
      plus.globalEvent.addEventListener('WebviewPostMessage', receiveMessage);
    },
    onShow() {
      const pages = getCurrentPages(), page = pages[pages.length - 1];
      if (!page || (page.$vm && page.$vm !== this)) return;
      const url = pageUrl(page);
      if (url.split('?')[0] === '/pages/guide/index') return;
      if (pending && pending.url === url) { history.commit(pending); pending = null; }
      else if (!pending) history.visit(url);
      this.$nextTick(() => this.attachAppHistory());
    },
    onReady() { this.attachAppHistory(); },
    onBackPress() {
      if (internalBack) return false;
      move(-1);
      return true;
    },
    methods: {
      attachAppHistory() {
        if (!this.$scope || !this.$scope.$getAppWebview) return;
        const view = this.$scope.$getAppWebview();
        activeView = view;
        if (!view.__wuseHistoryAttached) {
          view.__wuseHistoryAttached = true;
          // Native popGesture would bypass the shared history; Android system Back uses onBackPress.
          view.setStyle({ popGesture: 'none' });
        }
        refresh();
      },
    },
  });
}
