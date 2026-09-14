<template>
  <view :style="colorStyle + ';' + merchantStyle"
    ><template v-if="shop && decoration"
      ><view
        class="shop-category-header"
        :style="{ paddingTop: statusBar + 'px' }"
        ><shop-navigation :shop="shop" active="category" :showTitle="false" /><page-title
          v-if="showTitle"
          :dataConfig="decoration.title_component"
          :product="{ seller_shop_id: id }" /></view
      ><goods-cate1
        v-if="decoration.status === 1"
        ref="category"
        :shopId="id"
        :decoration="decoration"
        :navigationHeight="navigationHeight"
        :titleHeight="titleHeight" /><goods-cate2
        v-else-if="decoration.status === 2"
        ref="category"
        :shopId="id"
        :decoration="decoration"
        :navigationHeight="navigationHeight"
        :titleHeight="titleHeight"
        @jumpIndex="backToShop" /><goods-cate3
        v-else
        ref="category"
        :shopId="id"
        :decoration="decoration"
        :navigationHeight="navigationHeight"
        :titleHeight="titleHeight"
        @jumpIndex="backToShop" /><page-footer
        :configData="decorationNavigation" pageScoped
        :mainNavigationOnly="decoration.status !== 1"
        @heightChange="navigationHeight = $event" /></template
    ><view v-else class="store-state" @tap="load">{{
      loading ? "加载中…" : error + "，点击重试"
    }}</view></view
  >
</template>
<script>
import colors from "@/mixins/color";
import { getShop, getMerchantTheme } from "@/api/storefront";
import { merchantPaletteStyle } from "@/utils/merchantTheme";
import { getThemeInfo } from "@/api/api";
import { applyTheme } from "@/utils/theme";
import { normalizeCategoryPage } from "../../../shared/categoryPageConfig";
import { verticalStyleSpace } from "../../../shared/componentStyle";
import GoodsCate1 from "@/pages/goods_cate/goods_cate1";
import GoodsCate2 from "@/pages/goods_cate/goods_cate2";
import GoodsCate3 from "@/pages/goods_cate/goods_cate3";
import PageTitle from "@/subpackage/diyComponents/pageTitle";
import PageFooter from "@/components/pageFooter";
import ShopNavigation from "@/components/merchantDecoration/ShopNavigation";
import merchantDecoration from '@/mixins/merchantDecoration';
import { scopedNavigation } from '../../../shared/decorationContext';
export default {
  components: {
    GoodsCate1,
    GoodsCate2,
    GoodsCate3,
    PageTitle,
    PageFooter,
    ShopNavigation,
  },
  mixins: [colors, merchantDecoration],
  data: () => ({
    id: 0,
    previewPageId: 0,
    shop: null,
    decoration: null,
    merchantStyle: "",
    navigationHeight: 0,
    statusBar: 0,
    loading: false,
    error: "",
    sequence: 0,
  }),
  computed: {
    decorationNavigation() { return scopedNavigation(this.decoration && this.decoration.navigation, this.id); },
    showTitle() {
      return (
        this.decoration.show_title && !this.decoration.title_component.isHide
      );
    },
    titleHeight() {
      return (
        this.statusBar +
        44 +
        (this.showTitle
          ? 44 +
            (verticalStyleSpace(this.decoration.title_component) *
              uni.getWindowInfo().windowWidth) /
              375
          : 0)
      );
    },
  },
  onLoad(options) {
    this.id = Number(options.id) || 0;
    this.previewPageId = Number(options.shop_page_id) || 0;
    if (options.theme_id)
      uni.setStorageSync("previewThemeId", Number(options.theme_id));
    // #ifndef H5
    this.statusBar = uni.getWindowInfo().statusBarHeight || 0;
    // #endif
    applyTheme(uni.getStorageSync("previewThemeId") || 0);
    this.load();
  },
  onUnload() {
    this.sequence++;
  },
  onReachBottom() {
    if (this.$refs.category && this.$refs.category.productslist)
      this.$refs.category.productslist();
  },
  methods: {
    async load() {
      const seq = ++this.sequence;
      this.loading = true;
      this.error = "";
      try {
        const [shop, theme] = await Promise.all([
          getShop(this.id),
          getMerchantTheme(this.id, "category", {
            theme_id: uni.getStorageSync("previewThemeId") || 0,
            shop_page_id: this.previewPageId,
          }),
        ]);
        if (seq === this.sequence) {
          this.shop = shop.data;
          this.decoration = normalizeCategoryPage(theme.data.page);
          this.merchantStyle = merchantPaletteStyle(theme.data.palette);
          this.merchantPalette = theme.data.palette;
        }
      } catch (error) {
        if (seq === this.sequence) { this.shop=null; this.decoration=null; this.error=error.msg || "店铺分类读取失败"; }
      } finally {
        if (seq === this.sequence) this.loading = false;
      }
    },
    backToShop() {
      uni.redirectTo({ url: "/pages/merchant/shop?id=" + this.id });
    },
  },
};
</script>
<style scoped>
.shop-category-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 110;
  background: #fff;
}
.store-state {
  text-align: center;
  padding: 180rpx 30rpx;
  color: #999;
  font-size: 28rpx;
}
</style>
