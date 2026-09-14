<template>
  <view :style="[colorStyle, merchantStyle]"
    ><merchant-modules v-if="config" :dataConfig="config" :shopId="shopId"
  /></view>
</template>
<script>
import colors from "@/mixins/color";
import MerchantModules from "@/subpackage/diyComponents/merchantModules";
import { merchantComponent } from "../../../shared/merchantDecoration";
import { applyTheme } from "@/utils/theme";
import { getMerchantTheme } from "@/api/storefront";
import { merchantPaletteStyle } from "@/utils/merchantTheme";
import merchantDecoration from '@/mixins/merchantDecoration';
export default {
  components: { MerchantModules },
  mixins: [colors, merchantDecoration],
  data: () => ({ config: null, shopId: 0, merchantStyle: "" }),
  onLoad(options) {
    this.shopId = Number(options.shop_id) || 0;
    if (options.theme_id)
      uni.setStorageSync("previewThemeId", Number(options.theme_id));
    applyTheme(uni.getStorageSync("previewThemeId") || 0);
    if (this.shopId)
      getMerchantTheme(this.shopId, "theme", {shop_page_id: Number(options.shop_page_id) || 0, theme_id: uni.getStorageSync('previewThemeId') || 0})
        .then((res) => {
          this.merchantStyle = merchantPaletteStyle(res.data.palette);
          this.merchantPalette = res.data.palette;
          if (this.config) this.config.showMerchantName = !!res.data.palette.show_merchant_name;
        })
        .catch(() => {});
    this.config = merchantComponent("shopProducts", {
      title: options.title || "商品列表",
      categoryId: Number(options.category_id) || 0,
      recommend: options.recommend || "",
      keyword: options.keyword || "",
      showMore: false,
      limit: 20,
      showMerchantName: !!uni.getStorageSync("showMerchantName"),
    });
    uni.setNavigationBarTitle({ title: this.config.title });
  },
};
</script>
