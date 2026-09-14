<template>
  <view
    :style="colorStyle + ';' + merchantStyle"
    class="merchant-shop-page"
    ><view :style="pageStyle"><template v-if="shop"
      ><shop-navigation v-if="!hasShopHeader && pageConfig.page_title_mode !== 'component'" :shop="shop" /><page-design
        v-if="pageConfig.is_show !== 0"
        :diyData="pageConfig"
        :shopId="Number(shop.id)"
        :shopData="shop"
        :themeStyle="merchantStyle"
      /><view v-else class="store-state">店铺页面暂未开放</view></template
    ><view v-else class="store-state"
      >{{ loading ? "加载中…" : error
      }}<view v-if="!loading" class="retry" @tap="load">重新加载</view></view
    ></view></view
  >
</template>
<script>
import colors from "@/mixins/color";
import PageDesign from "@/subpackage/diyComponents/pageDesign.vue";
import ShopNavigation from "@/components/merchantDecoration/ShopNavigation.vue";
import { getShop, getMerchantTheme } from "@/api/storefront";
import { merchantPaletteStyle } from "@/utils/merchantTheme";
import { getThemeInfo } from "@/api/api";
import { applyTheme } from "@/utils/theme";
import { defaultShopPage } from "../../../shared/merchantDecoration";
import { HTTP_REQUEST_URL } from "@/config/app";
import merchantDecoration from '@/mixins/merchantDecoration';
import { pageNavigation } from '../../../shared/decorationContext';
export default {
  components: { PageDesign, ShopNavigation },
  mixins: [colors, merchantDecoration],
  data: () => ({
    id: 0,
    previewPageId: 0,
    merchantStyle: "",
    shop: null,
    pageConfig: defaultShopPage(),
    loading: false,
    error: "",
    sequence: 0,
  }),
  computed: {
    decorationNavigation() { return pageNavigation(this.pageConfig, this.id); },
    hasShopHeader() {
      return Object.values(this.pageConfig.value || {}).some(
        (item) => item.name === "shopHeader" && !item.isHide
      );
    },
    pageStyle() {
      const p = this.pageConfig;
      let image = p.is_bg_pic ? p.bg_pic : "";
      if (image && image.startsWith("/")) image = HTTP_REQUEST_URL + image;
      return {
        backgroundColor: p.is_bg_color ? p.color_picker : "#f5f5f5",
        backgroundImage: image ? "url(" + image + ")" : "",
        backgroundSize: "cover",
        minHeight: "100vh",
        paddingTop: "var(--status-bar-height)",
        boxSizing: "border-box",
      };
    },
  },
  onLoad(options) {
    this.id = Number(options.id) || 0;
    this.previewPageId = Number(options.shop_page_id) || 0;
    if (options.theme_id)
      uni.setStorageSync("previewThemeId", Number(options.theme_id));
    applyTheme(uni.getStorageSync("previewThemeId") || 0);
    this.load();
  },
  onUnload() {
    this.sequence++;
  },
  onPullDownRefresh() {
    this.load().finally(() => uni.stopPullDownRefresh());
  },
  methods: {
    async load() {
      const seq = ++this.sequence;
      this.loading = true;
      this.error = "";
      try {
        if (!this.id) throw { msg: "请选择要访问的店铺" };
        const [res, theme] = await Promise.all([
          getShop(this.id),
          getMerchantTheme(this.id, "home", {
            theme_id: uni.getStorageSync("previewThemeId") || 0,
            shop_page_id: this.previewPageId,
          }),
        ]);
        if (seq === this.sequence) {
          this.shop = res.data;
          this.pageConfig =
            theme.data.page && theme.data.page.value
              ? theme.data.page
              : defaultShopPage();
          this.merchantStyle = merchantPaletteStyle(theme.data.palette);
          this.merchantPalette = theme.data.palette;
          uni.setNavigationBarTitle({ title: res.data.name });
        }
      } catch (error) {
        if (seq === this.sequence) {
          this.shop = null;
          this.error = error.msg || "店铺读取失败";
        }
      } finally {
        if (seq === this.sequence) this.loading = false;
      }
    },
  },
};
</script>
<style scoped>
.store-state {
  padding: 180rpx 30rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
.retry {
  margin: 30rpx auto;
  color: var(--view-theme);
}
</style>
