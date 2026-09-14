<template>
  <view
    v-if="visible && product.seller_shop_id && product.merchant_name"
    class="merchant-name line1"
    @tap.stop="openShop"
    ><text class="iconfont icon-ic_shop" />{{ product.merchant_name
    }}<text class="iconfont icon-ic_rightarrow"
  /></view>
</template>
<script>
import { shopUrl } from "../../../shared/merchantDecoration";
export default {
  inject: { merchantDisplay: { default: null } },
  props: {
    product: { type: Object, default: () => ({}) },
    show: { default: undefined },
  },
  data: () => ({ themeShow: !!uni.getStorageSync("showMerchantName") }),
  computed: {
    visible() {
      const scoped = this.merchantDisplay ? this.merchantDisplay() : undefined;
      return this.show === undefined ? (scoped === undefined ? this.themeShow : scoped) : !!this.show;
    },
  },
  created() {
    this.onMerchantDisplay = (value) => {
      this.themeShow = !!value;
    };
    uni.$on("merchant-name-display", this.onMerchantDisplay);
  },
  beforeDestroy() {
    uni.$off("merchant-name-display", this.onMerchantDisplay);
  },
  methods: {
    openShop() {
      uni.navigateTo({
        url: shopUrl(
          this.product.seller_shop_id,
          uni.getStorageSync("previewThemeId")
        ),
      });
    },
  },
};
</script>
<style scoped>
.merchant-name {
  display: block;
  max-width: 100%;
  font-size: 22rpx;
  line-height: 34rpx;
  color: #888;
  margin-top: 8rpx;
}
.merchant-name .iconfont {
  font-size: 22rpx;
  margin-right: 6rpx;
}
</style>
