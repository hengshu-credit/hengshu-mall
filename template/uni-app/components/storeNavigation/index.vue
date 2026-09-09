<template>
  <view class="store-navigation" :style="colorStyle">
    <pageFooter v-if="routeAllowsNavigation" :managed="true" :configData="navigation" :activePath="routePath" :collapsed="collapsed || keyboardOpen" />
  </view>
</template>

<script>
import pageFooter from '@/components/pageFooter/index.vue';
import colors from '@/mixins/color.js';
import { getNavigation } from '@/api/public.js';
import { getThemeInfo } from '@/api/api.js';

export default {
  components: { pageFooter },
  mixins: [colors],
  data() {
    return { navigation: {}, routePath: '', activePage: null, collapsed: false, keyboardOpen: false };
  },
  computed: {
    routeAllowsNavigation() {
      return ['/pages/index/index', '/pages/order_addcart/order_addcart', '/pages/user/index'].includes(this.routePath) ||
        (this.routePath === '/pages/goods/goods_list/index' && !!(this.activePage && this.activePage.showEmptyCategoryNavigation));
    },
    enabled() {
      return this.routeAllowsNavigation && !this.navigation.isHide && !!(this.navigation.effectConfig && Number(this.navigation.effectConfig.tabVal)) &&
        Array.isArray(this.navigation.menuList) && this.navigation.menuList.length > 0;
    },
  },
  watch: {
    routeAllowsNavigation(allowed) {
      if (allowed && this.routePath === '/pages/goods/goods_list/index') {
        this.collapsed = false;
        this._positions = new WeakMap();
        this._ignoreScrollUntil = Date.now() + 200;
        this.refreshNavigation();
      }
      this.$nextTick(this.scheduleLayout);
    },
    enabled() { this.$nextTick(this.scheduleLayout); },
    collapsed() { this.updateOffset(); },
    keyboardOpen() { this.updateOffset(); },
  },
  mounted() {
    this._positions = new WeakMap();
    this._height = 0;
    this._unroute = getApp().$router.afterEach(this.routeChanged);
    document.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
    document.addEventListener('focusin', this.onFocus);
    document.addEventListener('focusout', this.onBlur);
    window.addEventListener('resize', this.scheduleLayout);
    this._observer = new MutationObserver(this.scheduleLayout);
    this._observer.observe(document.body, { childList: true, subtree: true });
    this._resize = new ResizeObserver(this.scheduleLayout);
    this._resize.observe(this.$el);
    uni.$on('uploadFooter', this.refreshNavigation);
    this.routeChanged(getApp().$router.currentRoute);
  },
  beforeDestroy() {
    this._unroute();
    this._observer.disconnect();
    this._resize.disconnect();
    cancelAnimationFrame(this._layoutFrame);
    document.removeEventListener('scroll', this.onScroll, true);
    document.removeEventListener('focusin', this.onFocus);
    document.removeEventListener('focusout', this.onBlur);
    window.removeEventListener('resize', this.scheduleLayout);
    uni.$off('uploadFooter', this.refreshNavigation);
    document.body.classList.remove('has-store-navigation');
    document.documentElement.style.removeProperty('--store-nav-height');
    document.documentElement.style.removeProperty('--store-nav-offset');
  },
  methods: {
    routeChanged(route) {
      this.routePath = route.path;
      this.activePage = null;
      this.collapsed = false;
      this.keyboardOpen = false;
      this._positions = new WeakMap();
      this._ignoreScrollUntil = Date.now() + 200;
      if (this.routeAllowsNavigation) this.refreshNavigation();
      this.scheduleLayout();
    },
    refreshNavigation() {
      if (this._navigationRequest) return this._navigationRequest;
      const preview = uni.getStorageSync('previewThemeId');
      const request = preview ? getThemeInfo('home', { theme_id: preview }).then(res => {
        const items = Object.values(res.data.value || {});
        return { data: items.find(item => item.name === 'pageFoot') || {} };
      }) : getNavigation();
      this._navigationRequest = request.then(res => {
        if (this._isDestroyed) return;
        this.navigation = res.data && !Array.isArray(res.data) ? res.data : {};
        if (this.enabled) uni.hideTabBar();
        this.$nextTick(this.scheduleLayout);
      }).catch(() => {}).finally(() => { this._navigationRequest = null; });
      return this._navigationRequest;
    },
    currentPageVm() {
      const pages = getCurrentPages();
      const page = pages[pages.length - 1];
      return page && page.$vm;
    },
    currentPage() {
      const page = this.currentPageVm();
      return page && page.$el;
    },
    scheduleLayout() {
      if (this._isDestroyed || this._layoutFrame) return;
      this._layoutFrame = requestAnimationFrame(() => { this._layoutFrame = 0; this.measureLayout(); });
    },
    measureLayout() {
      // Track the mounted page so its result state remains reactive, including history restoration.
      this.activePage = this.currentPageVm();
      document.body.classList.toggle('has-store-navigation', !!this.enabled);
      const dock = this.$el.querySelector('.footer-dock');
      this._height = this.enabled && dock ? dock.offsetHeight : 0;
      document.documentElement.style.setProperty('--store-nav-height', this._height + 'px');
      this.updateOffset();
      if (!this.enabled) return;
      const page = this.currentPage();
      if (!page || !page.querySelectorAll) return;
      page.querySelectorAll('.footer').forEach(element => {
        // Lift page action bars, while leaving modal footers and ordinary content alone.
        if (element.closest('.product-window, .cartList, .uni-popup, .tui-drawer-container')) return;
        const style = getComputedStyle(element);
        if (style.position === 'fixed' && style.bottom !== 'auto' && element.offsetHeight < 200) {
          element.classList.add('store-navigation-action');
        }
      });
      page.querySelectorAll('.uni-scroll-view').forEach(element => {
        if (!/auto|scroll/.test(getComputedStyle(element).overflowY)) return;
        const content = element.firstElementChild;
        if (content && !content.classList.contains('store-navigation-scroll-space')) {
          content.style.setProperty('--store-original-padding', getComputedStyle(content).paddingBottom);
          content.classList.add('store-navigation-scroll-space');
        }
      });
    },
    updateOffset() {
      const height = this.enabled && !this.collapsed && !this.keyboardOpen ? this._height || 0 : 0;
      document.documentElement.style.setProperty('--store-nav-offset', height + 'px');
    },
    onScroll(event) {
      if (!this.enabled || Date.now() < this._ignoreScrollUntil) return;
      const element = event.target === document ? document.scrollingElement : event.target;
      if (!element || !element.closest || element.closest('.store-navigation, .aside, .longTab, .product-window, .cartList')) return;
      const page = this.currentPage();
      if (element !== document.scrollingElement && (!page || !page.contains(element))) return;
      const top = Math.max(0, element.scrollTop);
      let position = this._positions.get(element);
      if (!position) position = { top: 0, distance: 0, direction: 0 };
      const delta = top - position.top;
      const direction = Math.sign(delta);
      position.distance = direction === position.direction ? position.distance + Math.abs(delta) : Math.abs(delta);
      position.top = top;
      position.direction = direction;
      this._positions.set(element, position);
      // Keep navigation available near the top; hiding needs a more deliberate scroll than revealing.
      if (top <= 160) this.collapsed = false;
      else if (direction > 0 && position.distance >= 120) this.collapsed = true;
      else if (direction < 0 && position.distance >= 32) this.collapsed = false;
    },
    onFocus(event) { if (event.target.matches('input, textarea, [contenteditable="true"]')) this.keyboardOpen = true; },
    onBlur() { this.keyboardOpen = false; this.scheduleLayout(); },
  },
};
</script>

<style lang="scss">
body.has-store-navigation {
  uni-tabbar { display: none !important; }
  uni-page-body::after { content: ''; display: block; height: var(--store-nav-height, 0px); }
  .store-navigation-scroll-space { padding-bottom: calc(var(--store-original-padding, 0px) + var(--store-nav-height, 0px)) !important; }
  .store-navigation-action { bottom: var(--store-nav-offset, 0px) !important; transition: bottom 180ms ease; }
}
@media (prefers-reduced-motion: reduce) {
  body.has-store-navigation .store-navigation-action { transition: none; }
}
</style>
