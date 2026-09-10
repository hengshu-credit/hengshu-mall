import { normalizeCategoryPage, categoryPageStyle } from '../../shared/categoryPageConfig';
import { componentStyle, verticalStyleSpace } from '../../shared/componentStyle';
import { emitThemeScroll } from './themePageEvents';
export default {
  data() { return { checkoutHeight: 0 }; },
  mounted() { uni.$on('theme-page-show', this.refreshCheckoutOnShow); },
  beforeDestroy() { uni.$off('theme-page-show', this.refreshCheckoutOnShow); },
  methods: {
    notifyThemeScroll(event) { emitThemeScroll(event.detail.scrollTop); },
    refreshCheckoutOnShow(event) {
      if (!event || event.path !== '/pages/goods_cate/goods_cate' || !this.getCartList) return;
      if (this.isLogin) { this.getCartNum(); this.getCartList(1); }
      else { this.cartCount = 0; this.totalPrice = 0; this.cartData.cartList = []; this.cartData.iScart = false; }
    },
  },
  props: { titleHeight: {type:Number,default:0}, navigationHeight: { type: Number, default: 0 }, decoration: { type: Object, default: () => ({}) } },
  watch: { titleHeight() { this.$nextTick(()=>{if(this.measureScrollHeight)this.measureScrollHeight();}); } },
  computed: {
    categoryAppearance() { const config=normalizeCategoryPage(this.decoration);if(config.search_hidden)config.show_search=0;return config; },
    checkoutConfig() { return this.categoryAppearance.checkout || {}; },
    categoryOuterStyle() { return { ...componentStyle(this.categoryAppearance.category_style || {}, 'rpx').outer, ...(this.categoryAppearance.status === 1 ? { display: 'flex', flex: 1, minHeight: 0 } : {}) }; },
    categoryModuleStyle() { return this.categoryAppearance.category_style ? componentStyle(this.categoryAppearance.category_style, 'rpx').inner : {}; },
    decorationStyle() {
      const style = categoryPageStyle(this.categoryAppearance, 'var(--view-theme)');
      // CSS custom properties are not converted from rpx by the H5 renderer.
      const scale = uni.getWindowInfo().windowWidth / 750;
      style['--cat-search-height'] = (this.categoryAppearance.show_search ? (96 + verticalStyleSpace(this.categoryAppearance.search_component) * 2) * scale : 0) + 'px';
      style['--cat-module-space'] = verticalStyleSpace(this.categoryAppearance.category_style) * 2 * scale + 'px';
      style['--category-navigation-height'] = this.navigationHeight + 'px';
      style['--category-checkout-height'] = this.checkoutHeight + 'px';
      style['--category-title-height'] = this.titleHeight + 'px';
      return style;
    },
    decorationClasses() { return { 'no-search': !this.categoryAppearance.show_search, 'modular-category': !!this.categoryAppearance.category_style, 'outline-tabs': this.categoryAppearance.sub_tab_style === 'outline' }; },
  },
};
